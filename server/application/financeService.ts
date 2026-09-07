import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { AppError, assertFound } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query, withTransaction } from "../infrastructure/database";
import type { FeeStructureCreateInput, FeeStructureUpdateInput } from "../http/configurationSchemas";
import { AccessControlService } from "./accessControlService";

export type FeePaymentInput = {
  studentId: string;
  amount: number;
  term: string;
  year: string;
  method: string;
  receiptNo?: string;
  paidAt?: string;
  description?: string;
};

export type FeePeriodInput = {
  className?: string;
  term?: string;
  year?: string;
};

function makeReceiptNo() {
  return `RCPT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function totalItems(items: Array<{ name: string; amount: number }>) {
  return Math.round(items.reduce((total, item) => total + Number(item.amount), 0) * 100) / 100;
}

function numeric(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class FinanceService {
  constructor(private readonly accessControl = new AccessControlService()) {}

  async period(tenant: TenantContext, requested: FeePeriodInput = {}) {
    const result = await query<{ currentTerm: string; academicYear: string; currency: string }>(
      `select "currentTerm", "academicYear", currency
       from school_settings where "schoolId" = $1 limit 1`,
      [tenant.schoolId],
    );
    const settings = assertFound(result.rows[0], "School settings are not configured");
    return {
      term: requested.term?.trim() || settings.currentTerm,
      year: requested.year?.trim() || settings.academicYear,
      currency: settings.currency,
    };
  }

  async listFeeStructures(tenant: TenantContext, includeInactive = false) {
    const result = await query(
      `select * from fee_structures
       where "schoolId" = $1 and ($2::boolean = true or active = true)
       order by active desc, "academicYear" desc, term, "className"`,
      [tenant.schoolId, includeInactive],
    );
    return result.rows.map((row) => ({ ...row, totalAmount: numeric(row.totalAmount) }));
  }

  async createFeeStructure(actor: AuthUser, tenant: TenantContext, input: FeeStructureCreateInput) {
    return withTransaction(async (client) => {
      await this.assertConfiguredClass(client, tenant.schoolId, input.className);
      await this.assertUniquePeriod(client, tenant.schoolId, input.className, input.term, input.academicYear);
      const totalAmount = totalItems(input.items);
      const result = await client.query(
        `insert into fee_structures (
           "schoolId", "className", term, "academicYear", items, "totalAmount", "dueDate", active, "createdBy", "updatedBy"
         ) values ($1, $2, $3, $4, $5::jsonb, $6, $7, true, $8, $8)
         returning *`,
        [tenant.schoolId, input.className, input.term, input.academicYear, JSON.stringify(input.items), totalAmount, input.dueDate ?? null, actor.id],
      );
      const structure = result.rows[0];
      await this.audit(client, actor, tenant, structure.id, "fee_structure.created", {
        className: input.className, term: input.term, year: input.academicYear, totalAmount,
      });
      return { ...structure, totalAmount };
    });
  }

  async updateFeeStructure(actor: AuthUser, tenant: TenantContext, id: string, input: FeeStructureUpdateInput) {
    return withTransaction(async (client) => {
      const currentResult = await client.query(
        `select * from fee_structures where id = $1 and "schoolId" = $2 for update`,
        [id, tenant.schoolId],
      );
      const current = assertFound(currentResult.rows[0], "Fee structure not found");
      if (!current.active) throw new AppError(409, "Archived fee structures cannot be edited");

      const className = input.className ?? current.className;
      const term = input.term ?? current.term;
      const academicYear = input.academicYear ?? current.academicYear;
      const items = input.items ?? current.items;
      await this.assertConfiguredClass(client, tenant.schoolId, className);
      await this.assertUniquePeriod(client, tenant.schoolId, className, term, academicYear, id);
      const totalAmount = totalItems(items);
      const result = await client.query(
        `update fee_structures set
           "className" = $3, term = $4, "academicYear" = $5,
           items = $6::jsonb, "totalAmount" = $7, "dueDate" = $8,
           "updatedBy" = $9, "updatedAt" = now()
         where id = $1 and "schoolId" = $2
         returning *`,
        [
          id, tenant.schoolId, className, term, academicYear, JSON.stringify(items), totalAmount,
          input.dueDate === undefined ? current.dueDate : input.dueDate, actor.id,
        ],
      );
      const structure = assertFound(result.rows[0], "Fee structure not found");
      await this.audit(client, actor, tenant, id, "fee_structure.updated", { className, term, year: academicYear, totalAmount });
      return { ...structure, totalAmount };
    });
  }

  async deactivateFeeStructure(actor: AuthUser, tenant: TenantContext, id: string) {
    return withTransaction(async (client) => {
      const result = await client.query(
        `update fee_structures
         set active = false, "updatedBy" = $3, "updatedAt" = now()
         where id = $1 and "schoolId" = $2 and active = true
         returning *`,
        [id, tenant.schoolId, actor.id],
      );
      const structure = assertFound(result.rows[0], "Active fee structure not found");
      await this.audit(client, actor, tenant, id, "fee_structure.deactivated", {
        className: structure.className, term: structure.term, year: structure.academicYear,
      });
      return { ...structure, totalAmount: numeric(structure.totalAmount) };
    });
  }

  async recordFeePayment(actor: AuthUser, tenant: TenantContext, input: FeePaymentInput) {
    const receiptNo = input.receiptNo?.trim() || makeReceiptNo();
    return withTransaction(async (client) => {
      const studentResult = await client.query<{ id: string; name: string; class: string }>(
        `select id, name, class from students where id = $1 and "schoolId" = $2 limit 1`,
        [input.studentId, tenant.schoolId],
      );
      const student = assertFound(studentResult.rows[0], "Student not found");
      const settingsResult = await client.query<{ currency: string }>(
        `select currency from school_settings where "schoolId" = $1`,
        [tenant.schoolId],
      );
      const currency = settingsResult.rows[0]?.currency || "UGX";

      const transactionResult = await client.query(
        `insert into transactions (
           "schoolId", type, category, amount, date, status, "studentId", reference, description, currency
         ) values ($1, 'income', 'Tuition Fees', $2, coalesce($3::timestamptz, now())::date, 'completed', $4, $5, $6, $7)
         returning *`,
        [
          tenant.schoolId, input.amount, input.paidAt ?? null, input.studentId, receiptNo,
          input.description || `Fees payment for ${student.name} (${input.term}, ${input.year})`, currency,
        ],
      );
      const transaction = transactionResult.rows[0];
      const paymentResult = await client.query(
        `insert into fee_payments (
           "schoolId", "studentId", amount, term, year, method, "receiptNo", "paidAt", description, "recordedBy", "transactionId"
         ) values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::timestamptz, now()), $9, $10, $11)
         returning *`,
        [
          tenant.schoolId, input.studentId, input.amount, input.term, input.year, input.method, receiptNo,
          input.paidAt ?? null, input.description ?? null, actor.id, transaction.id,
        ],
      );

      // Compatibility only. Operational reads use fee_payments and fee_structures.
      await client.query(
        `update students
         set "totalFeesPaid" = coalesce("totalFeesPaid", 0) + $3,
             "feesBalance" = greatest(0, coalesce("feesBalance", 0) - $3),
             "updatedAt" = now()
         where id = $1 and "schoolId" = $2`,
        [input.studentId, tenant.schoolId, input.amount],
      );

      await this.audit(client, actor, tenant, paymentResult.rows[0].id, "fee_payment.recorded", {
        studentId: input.studentId, receiptNo, amount: input.amount, term: input.term, year: input.year,
      }, "fee_payments");
      const balance = await this.balanceForStudent(client, tenant.schoolId, input.studentId, input.term, input.year);
      return { payment: paymentResult.rows[0], transaction, balance };
    });
  }

  async listBalances(actor: AuthUser, tenant: TenantContext, requested: FeePeriodInput = {}) {
    const period = await this.period(tenant, requested);
    const hasFullAccess = tenant.roles.includes("admin") || tenant.roles.includes("accountant") || tenant.supportAccess;
    const hasLinkedAccess = tenant.roles.includes("parent") || tenant.roles.includes("student");
    if (!hasFullAccess && !hasLinkedAccess) throw new AppError(403, "You do not have permission to view fee balances");

    const studentIds = hasFullAccess ? null : await this.accessControl.scopedStudentIds(actor, tenant, "billing");
    if (studentIds?.length === 0) return { ...period, balances: [] };

    const params: unknown[] = [tenant.schoolId, period.term, period.year, studentIds];
    let classFilter = "";
    if (requested.className) {
      params.push(requested.className);
      classFilter = ` and st.class = $${params.length}`;
    }
    const result = await query(
      `${this.balanceSelect()}
       where st."schoolId" = $1 and ($4::uuid[] is null or st.id = any($4::uuid[]))${classFilter}
       order by st.name`,
      params,
    );
    return { ...period, balances: result.rows.map((row) => this.normalizeBalance(row)) };
  }

  async ledgerSummary(tenant: TenantContext) {
    const result = await query(
      `select
         coalesce(sum(amount) filter (where type = 'income'), 0)::numeric(14,2) as "totalIncome",
         coalesce(sum(amount) filter (where type = 'expense'), 0)::numeric(14,2) as "totalExpenses",
         (coalesce(sum(amount) filter (where type = 'income'), 0) - coalesce(sum(amount) filter (where type = 'expense'), 0))::numeric(14,2) as "netBalance"
       from transactions where "schoolId" = $1`,
      [tenant.schoolId],
    );
    const row = result.rows[0] ?? {};
    return { totalIncome: numeric(row.totalIncome), totalExpenses: numeric(row.totalExpenses), netBalance: numeric(row.netBalance) };
  }

  async assertReceiptAvailable(tenant: TenantContext, receiptNo: string) {
    const result = await query(`select id from fee_payments where "schoolId" = $1 and "receiptNo" = $2`, [tenant.schoolId, receiptNo]);
    if (result.rows.length) throw new AppError(409, "Receipt number already exists");
  }

  private balanceSelect() {
    return `select
       st."schoolId", st.id as "studentId", st.name as "studentName", st.reg, st.class,
       $2::text as term, $3::text as year,
       coalesce(fs."totalAmount", 0)::numeric(14,2) as "standardFee",
       coalesce(paid.total_paid, 0)::numeric(14,2) as "paidAmount",
       greatest(coalesce(fs."totalAmount", 0) - coalesce(paid.total_paid, 0), 0)::numeric(14,2) as "outstandingAmount",
       greatest(coalesce(paid.total_paid, 0) - coalesce(fs."totalAmount", 0), 0)::numeric(14,2) as "creditAmount",
       case
         when coalesce(fs."totalAmount", 0) <= 0 then 'unconfigured'
         when coalesce(paid.total_paid, 0) >= coalesce(fs."totalAmount", 0) then 'paid'
         when coalesce(paid.total_paid, 0) > 0 then 'partial'
         else 'outstanding'
       end as status
     from students st
     left join fee_structures fs on fs."schoolId" = st."schoolId"
       and lower(trim(fs."className")) = lower(trim(st.class))
       and lower(trim(fs.term)) = lower(trim($2::text))
       and lower(trim(fs."academicYear")) = lower(trim($3::text))
       and fs.active = true
     left join lateral (
       select coalesce(sum(fp.amount), 0) as total_paid
       from fee_payments fp
       where fp."schoolId" = st."schoolId" and fp."studentId" = st.id
         and lower(trim(fp.term)) = lower(trim($2::text))
         and lower(trim(fp.year)) = lower(trim($3::text))
     ) paid on true`;
  }

  private async balanceForStudent(client: PoolClient, schoolId: string, studentId: string, term: string, year: string) {
    const result = await client.query(
      `${this.balanceSelect()} where st."schoolId" = $1 and st.id = $4 limit 1`,
      [schoolId, term, year, studentId],
    );
    return result.rows[0] ? this.normalizeBalance(result.rows[0]) : null;
  }

  private normalizeBalance(row: Record<string, unknown>) {
    return {
      ...row,
      standardFee: numeric(row.standardFee), paidAmount: numeric(row.paidAmount),
      outstandingAmount: numeric(row.outstandingAmount), creditAmount: numeric(row.creditAmount),
    };
  }

  private async assertConfiguredClass(client: PoolClient, schoolId: string, className: string) {
    const result = await client.query<{ classes: unknown }>(`select classes from school_settings where "schoolId" = $1`, [schoolId]);
    const classes = Array.isArray(result.rows[0]?.classes) ? result.rows[0].classes : [];
    if (!classes.some((value) => typeof value === "string" && value.toLowerCase() === className.toLowerCase())) {
      throw new AppError(400, "Select a class configured for this school", {
        fieldErrors: { className: ["The selected class is not in School Settings"] },
      });
    }
  }

  private async assertUniquePeriod(
    client: PoolClient,
    schoolId: string,
    className: string,
    term: string,
    academicYear: string,
    excludedId?: string,
  ) {
    const result = await client.query(
      `select id from fee_structures
       where "schoolId" = $1
         and lower(trim("className")) = lower(trim($2))
         and lower(trim(term)) = lower(trim($3))
         and lower(trim("academicYear")) = lower(trim($4))
         and active = true and ($5::uuid is null or id <> $5)
       limit 1`,
      [schoolId, className, term, academicYear, excludedId ?? null],
    );
    if (result.rows[0]) {
      throw new AppError(409, "A fee structure already exists for this class and period", {
        fieldErrors: { className: ["Edit the existing active structure instead"] },
      });
    }
  }

  private async audit(
    client: PoolClient,
    actor: AuthUser,
    tenant: TenantContext,
    entityId: string,
    action: string,
    metadata: Record<string, unknown>,
    entity = "fee_structures",
  ) {
    await client.query(
      `insert into audit_logs (
         "schoolId", "actorId", action, entity, "entityId", "riskLevel", summary, metadata
       ) values ($1, $2, $3, $4, $5, 'sensitive', $6, $7::jsonb)`,
      [tenant.schoolId, actor.id, action, entity, entityId, "Changed school fee records", JSON.stringify(metadata)],
    );
  }
}
