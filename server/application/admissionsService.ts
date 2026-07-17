import { randomBytes } from "node:crypto";
import { assertFound } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query, withTransaction } from "../infrastructure/database";
import { AuditService } from "./auditService";
import { NotificationService } from "./notificationService";

export type AdmissionCreateInput = {
  studentName: string;
  gender?: string;
  dateOfBirth?: string;
  classApplied: string;
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;
  parentWhatsApp?: string;
  documents?: Record<string, unknown>;
};

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function makeAdmissionNo(sequence: number) {
  return `ADM-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`;
}

function makePayCode() {
  return `PAY-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export class AdmissionsService {
  constructor(
    private readonly auditService = new AuditService(),
    private readonly notificationService = new NotificationService(),
  ) {}

  async list(tenant: TenantContext) {
    const result = await query(
      `select * from admissions where "schoolId" = $1 order by "createdAt" desc`,
      [tenant.schoolId],
    );
    return result.rows;
  }

  async create(actor: AuthUser, tenant: TenantContext, input: AdmissionCreateInput) {
    const admission = await withTransaction(async (client) => {
      const countResult = await client.query<{ count: string }>(
        `select count(*) from admissions where "schoolId" = $1`,
        [tenant.schoolId],
      );
      const sequence = Number(countResult.rows[0]?.count ?? 0) + 1;
      const admissionNo = makeAdmissionNo(sequence);
      const result = await client.query(
        `insert into admissions (
           "schoolId", "studentName", gender, "dateOfBirth", "classApplied", "parentName",
           "parentEmail", "parentPhone", "parentWhatsApp", documents, "admissionNo", "createdBy"
         ) values ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)
         returning *`,
        [
          tenant.schoolId,
          input.studentName,
          clean(input.gender),
          clean(input.dateOfBirth),
          input.classApplied,
          input.parentName,
          clean(input.parentEmail)?.toLowerCase(),
          clean(input.parentPhone),
          clean(input.parentWhatsApp),
          JSON.stringify(input.documents ?? {}),
          admissionNo,
          actor.id,
        ],
      );
      return result.rows[0];
    });

    await this.auditService.record(actor, tenant, {
      action: "admission.created",
      entity: "admissions",
      entityId: String(admission.id),
      riskLevel: "sensitive",
      summary: `Created admission for ${input.studentName}`,
      metadata: { classApplied: input.classApplied },
    });

    return admission;
  }

  async setStatus(actor: AuthUser, tenant: TenantContext, admissionId: string, status: "applied" | "admitted" | "enrolled" | "rejected") {
    if (status === "admitted" || status === "enrolled") {
      return this.admit(actor, tenant, admissionId, status);
    }

    const result = await query(
      `update admissions
       set status = $3, "reviewedBy" = $4, "reviewedAt" = now(), "updatedAt" = now()
       where id = $1 and "schoolId" = $2
       returning *`,
      [admissionId, tenant.schoolId, status, actor.id],
    );
    const admission = assertFound(result.rows[0], "Admission not found");
    await this.auditService.record(actor, tenant, {
      action: `admission.${status}`,
      entity: "admissions",
      entityId: admissionId,
      riskLevel: "sensitive",
      summary: `Admission marked ${status}`,
    });
    return admission;
  }

  private async admit(actor: AuthUser, tenant: TenantContext, admissionId: string, status: "admitted" | "enrolled") {
    const result = await withTransaction(async (client) => {
      const admissionResult = await client.query(
        `select * from admissions where id = $1 and "schoolId" = $2 for update`,
        [admissionId, tenant.schoolId],
      );
      const admission = assertFound(admissionResult.rows[0], "Admission not found") as Record<string, unknown>;

      let studentId = admission.studentId as string | null | undefined;
      if (!studentId) {
        const studentResult = await client.query(
          `insert into students (
             "schoolId", name, reg, class, parent, "parentPhone", "parentEmail",
             "parentWhatsApp", gender, "dateOfBirth", "admissionDate", "payCode", status
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, current_date, $11, 'active')
           returning *`,
          [
            tenant.schoolId,
            admission.studentName,
            admission.admissionNo,
            admission.classApplied,
            admission.parentName,
            admission.parentPhone,
            admission.parentEmail,
            admission.parentWhatsApp,
            admission.gender,
            admission.dateOfBirth,
            makePayCode(),
          ],
        );
        studentId = String(studentResult.rows[0].id);

        const parentResult = await client.query(
          `insert into parents ("schoolId", "fullName", email, phone, whatsapp, "dataConsentAt")
           values ($1, $2, $3, $4, $5, now())
           on conflict do nothing
           returning id`,
          [tenant.schoolId, admission.parentName, admission.parentEmail, admission.parentPhone, admission.parentWhatsApp],
        );
        let parentId = parentResult.rows[0]?.id;
        if (!parentId && admission.parentEmail) {
          const existingParent = await client.query(
            `select id from parents where "schoolId" = $1 and lower(email) = lower($2) limit 1`,
            [tenant.schoolId, admission.parentEmail],
          );
          parentId = existingParent.rows[0]?.id;
        }
        if (parentId) {
          await client.query(
            `insert into student_parents ("schoolId", "studentId", "parentId", relationship, "isPrimary", "canReceiveAlerts")
             values ($1, $2, $3, 'Guardian', true, true)
             on conflict do nothing`,
            [tenant.schoolId, studentId, parentId],
          );
        }
      }

      const updateResult = await client.query(
        `update admissions
         set status = $3, "studentId" = $4, "reviewedBy" = $5, "reviewedAt" = now(), "updatedAt" = now()
         where id = $1 and "schoolId" = $2
         returning *`,
        [admissionId, tenant.schoolId, status, studentId, actor.id],
      );
      return updateResult.rows[0];
    });

    await this.queueAdmissionNotice(tenant, result);
    await this.auditService.record(actor, tenant, {
      action: `admission.${status}`,
      entity: "admissions",
      entityId: admissionId,
      riskLevel: "sensitive",
      summary: `Admission ${status} and student record prepared`,
      metadata: { studentId: result.studentId },
    });

    return result;
  }

  private async queueAdmissionNotice(tenant: TenantContext, admission: Record<string, unknown>) {
    const feeResult = await query<{ amount: string | number | null }>(
      `select coalesce(
         (select fs."totalAmount" from fee_structures fs
          where fs."schoolId" = $1 and fs."className" = $2
          order by fs."updatedAt" desc limit 1),
         nullif(ss."classFees" ->> $2, '')::numeric,
         0
       ) as amount
       from school_settings ss where ss."schoolId" = $1 limit 1`,
      [tenant.schoolId, admission.classApplied],
    );
    const payload = {
      student: admission.studentName,
      classApplied: admission.classApplied,
      admissionNo: admission.admissionNo,
      amount: Number(feeResult.rows[0]?.amount ?? 0),
    };
    const baseKey = `admission:${admission.id}`;
    await Promise.all([
      admission.parentEmail && this.notificationService.queue(tenant, {
        type: "admission_notice",
        channel: "email",
        recipient: String(admission.parentEmail),
        template: "admission_notice",
        payload,
        idempotencyKey: `${baseKey}:email`,
      }),
      admission.parentPhone && this.notificationService.queue(tenant, {
        type: "admission_notice",
        channel: "sms",
        recipient: String(admission.parentPhone),
        template: "admission_notice",
        payload,
        idempotencyKey: `${baseKey}:sms`,
      }),
      admission.parentWhatsApp && this.notificationService.queue(tenant, {
        type: "admission_notice",
        channel: "whatsapp",
        recipient: String(admission.parentWhatsApp),
        template: "admission_notice",
        payload,
        idempotencyKey: `${baseKey}:whatsapp`,
      }),
    ]);
  }
}
