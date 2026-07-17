import { randomBytes } from "node:crypto";
import { AppError, assertFound } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query, withTransaction } from "../infrastructure/database";
import { AuditService } from "./auditService";

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

function makeReceiptNo() {
  return `RCPT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export class FinanceService {
  constructor(private readonly auditService = new AuditService()) {}

  async recordFeePayment(actor: AuthUser, tenant: TenantContext, input: FeePaymentInput) {
    const receiptNo = input.receiptNo?.trim() || makeReceiptNo();
    const result = await withTransaction(async (client) => {
      const studentResult = await client.query<{ id: string; name: string; class: string }>(
        `select id, name, class from students where id = $1 and "schoolId" = $2 limit 1`,
        [input.studentId, tenant.schoolId],
      );
      const student = assertFound(studentResult.rows[0], "Student not found");

      const transactionResult = await client.query(
        `insert into transactions (
           "schoolId", type, category, amount, date, status, "studentId", reference, description, currency
         ) values ($1, 'income', 'Tuition Fees', $2, coalesce($3::timestamptz, now())::date, 'completed', $4, $5, $6, 'UGX')
         returning *`,
        [
          tenant.schoolId,
          input.amount,
          input.paidAt ?? null,
          input.studentId,
          receiptNo,
          input.description || `Fees payment for ${student.name} (${input.term}, ${input.year})`,
        ],
      );
      const transaction = transactionResult.rows[0];

      const paymentResult = await client.query(
        `insert into fee_payments (
           "schoolId", "studentId", amount, term, year, method, "receiptNo", "paidAt", description, "recordedBy", "transactionId"
         ) values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::timestamptz, now()), $9, $10, $11)
         returning *`,
        [
          tenant.schoolId,
          input.studentId,
          input.amount,
          input.term,
          input.year,
          input.method,
          receiptNo,
          input.paidAt ?? null,
          input.description ?? null,
          actor.id,
          transaction.id,
        ],
      );

      await client.query(
        `update students
         set "totalFeesPaid" = coalesce("totalFeesPaid", 0) + $3,
             "feesBalance" = greatest(0, coalesce("feesBalance", 0) - $3),
             "updatedAt" = now()
         where id = $1 and "schoolId" = $2`,
        [input.studentId, tenant.schoolId, input.amount],
      );

      const balanceResult = await client.query(
        `select * from student_balances where "schoolId" = $1 and "studentId" = $2 limit 1`,
        [tenant.schoolId, input.studentId],
      );

      return {
        payment: paymentResult.rows[0],
        transaction,
        balance: balanceResult.rows[0] ?? null,
      };
    });

    await this.auditService.record(actor, tenant, {
      action: "fee_payment.recorded",
      entity: "fee_payments",
      entityId: String(result.payment.id),
      riskLevel: "sensitive",
      summary: `Recorded ${input.amount} fees payment`,
      metadata: { studentId: input.studentId, receiptNo },
    });

    return result;
  }

  async listBalances(tenant: TenantContext, className?: string) {
    const params: unknown[] = [tenant.schoolId];
    let filter = "";
    if (className) {
      params.push(className);
      filter = ` and class = $${params.length}`;
    }
    const result = await query(
      `select * from student_balances where "schoolId" = $1${filter} order by "studentName"`,
      params,
    );
    return result.rows;
  }

  async ledgerSummary(tenant: TenantContext) {
    const result = await query(
      `select
         coalesce(sum(amount) filter (where type = 'income'), 0)::numeric(14,2) as "totalIncome",
         coalesce(sum(amount) filter (where type = 'expense'), 0)::numeric(14,2) as "totalExpenses",
         (coalesce(sum(amount) filter (where type = 'income'), 0) - coalesce(sum(amount) filter (where type = 'expense'), 0))::numeric(14,2) as "netBalance"
       from transactions
       where "schoolId" = $1`,
      [tenant.schoolId],
    );
    return result.rows[0] ?? { totalIncome: 0, totalExpenses: 0, netBalance: 0 };
  }

  async assertReceiptAvailable(tenant: TenantContext, receiptNo: string) {
    const result = await query(`select id from fee_payments where "schoolId" = $1 and "receiptNo" = $2`, [tenant.schoolId, receiptNo]);
    if (result.rows.length) throw new AppError(409, "Receipt number already exists");
  }
}
