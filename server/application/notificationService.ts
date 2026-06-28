import type { NotificationChannel } from "../domain/providers";
import type { TenantContext } from "../domain/tenancy";
import { query } from "../infrastructure/database";

export class NotificationService {
  async queue(
    tenant: TenantContext,
    input: {
      type: string;
      channel: NotificationChannel;
      recipient: string;
      template: string;
      payload?: Record<string, unknown>;
      idempotencyKey?: string;
      scheduledFor?: string;
    },
  ) {
    if (!input.recipient) return null;
    const result = await query(
      `insert into notification_jobs (
         "schoolId", type, channel, recipient, template, payload, "idempotencyKey", "scheduledFor"
       ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, coalesce($8::timestamptz, now()))
       on conflict ("schoolId", "idempotencyKey") where "idempotencyKey" is not null do nothing
       returning *`,
      [
        tenant.schoolId,
        input.type,
        input.channel,
        input.recipient,
        input.template,
        JSON.stringify(input.payload ?? {}),
        input.idempotencyKey ?? null,
        input.scheduledFor ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }

  async queueSickbayAlert(tenant: TenantContext, studentId: string, diagnosis: string, occurredAt: string) {
    const contact = await query<{ parentPhone: string | null; parentEmail: string | null; parentWhatsApp: string | null; name: string }>(
      `select "parentPhone", "parentEmail", "parentWhatsApp", name
       from students where id = $1 and "schoolId" = $2`,
      [studentId, tenant.schoolId],
    );
    const student = contact.rows[0];
    if (!student) return;
    const payload = { student: student.name, diagnosis, occurredAt };
    await Promise.all([
      student.parentEmail && this.queue(tenant, { type: "sickbay_alert", channel: "email", recipient: student.parentEmail, template: "sickbay_visit", payload, idempotencyKey: `sickbay:${studentId}:${occurredAt}:email` }),
      student.parentPhone && this.queue(tenant, { type: "sickbay_alert", channel: "sms", recipient: student.parentPhone, template: "sickbay_visit", payload, idempotencyKey: `sickbay:${studentId}:${occurredAt}:sms` }),
      student.parentWhatsApp && this.queue(tenant, { type: "sickbay_alert", channel: "whatsapp", recipient: student.parentWhatsApp, template: "sickbay_visit", payload, idempotencyKey: `sickbay:${studentId}:${occurredAt}:whatsapp` }),
    ]);
  }

  async queueAttendanceAlert(tenant: TenantContext, studentId: string, occurredAt: string) {
    const contact = await query<{ parentPhone: string | null; parentEmail: string | null; parentWhatsApp: string | null; name: string }>(
      `select "parentPhone", "parentEmail", "parentWhatsApp", name
       from students where id = $1 and "schoolId" = $2`,
      [studentId, tenant.schoolId],
    );
    const student = contact.rows[0];
    if (!student) return;
    const payload = { student: student.name, occurredAt };
    const baseKey = `attendance:${studentId}:${occurredAt}`;
    await Promise.all([
      student.parentEmail && this.queue(tenant, { type: "attendance_check_in", channel: "email", recipient: student.parentEmail, template: "attendance_check_in", payload, idempotencyKey: `${baseKey}:email` }),
      student.parentPhone && this.queue(tenant, { type: "attendance_check_in", channel: "sms", recipient: student.parentPhone, template: "attendance_check_in", payload, idempotencyKey: `${baseKey}:sms` }),
      student.parentWhatsApp && this.queue(tenant, { type: "attendance_check_in", channel: "whatsapp", recipient: student.parentWhatsApp, template: "attendance_check_in", payload, idempotencyKey: `${baseKey}:whatsapp` }),
    ]);
  }
}
