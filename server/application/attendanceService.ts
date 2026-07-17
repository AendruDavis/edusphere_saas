import { AppError, assertFound } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query, withTransaction } from "../infrastructure/database";
import { AuditService } from "./auditService";
import { NotificationService } from "./notificationService";

export type AttendanceEventInput = {
  studentId: string;
  deviceId?: string;
  timestamp?: string;
  type: "IN" | "OUT";
  source: "biometric" | "machine" | "manual";
  recordedBy?: string;
  adminOverride?: boolean;
};

function eventLabel(type: "IN" | "OUT") {
  return type === "IN" ? "Arrived at School" : "Left School";
}

function formatKampala(iso: string) {
  return new Intl.DateTimeFormat("en-UG", {
    timeZone: "Africa/Kampala",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function minutesInKampala(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kampala",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function isWithinSchoolHours(iso: string) {
  const minutes = minutesInKampala(iso);
  return minutes >= 5 * 60 + 30 && minutes <= 18 * 60 + 30;
}

export class AttendanceService {
  constructor(
    private readonly notificationService = new NotificationService(),
    private readonly auditService = new AuditService(),
  ) {}

  async recordEvent(actor: AuthUser | null, tenant: TenantContext | { schoolId: string; role?: string; userId?: string }, input: AttendanceEventInput) {
    const occurredAt = input.timestamp ?? new Date().toISOString();
    const eventKey = `${input.source}:${input.deviceId ?? "manual"}:${input.studentId}:${input.type}:${occurredAt}`;

    const record = await withTransaction(async (client) => {
      const studentResult = await client.query<{ id: string; name: string }>(
        `select id, name from students where id = $1 and "schoolId" = $2 limit 1`,
        [input.studentId, tenant.schoolId],
      );
      const student = assertFound(studentResult.rows[0], "Student not found");

      if (input.source === "biometric") {
        await client.query(
          `insert into biometric_events ("schoolId", "studentId", "deviceId", "eventKey", "occurredAt", payload)
           values ($1, $2, $3, $4, $5, $6::jsonb)
           on conflict ("schoolId", "eventKey") do nothing`,
          [tenant.schoolId, input.studentId, input.deviceId ?? "unknown", eventKey, occurredAt, JSON.stringify(input)],
        );
      }

      const attendance = await client.query(
        `insert into attendance_records (
           "schoolId", "studentId", "studentRefId", "studentName", date, status, role,
           "biometricVerified", "deviceId", "checkInAt", source, "idempotencyKey",
           "eventType", "recordedBy", "parentNotificationStatus"
         ) values (
           $1, $2, $2, $3, $4::timestamptz::date, 'present', 'Student',
           $5, $6, $4, $7, $8, $9, $10, 'not_required'
         )
         on conflict ("schoolId", "idempotencyKey") where "idempotencyKey" is not null do nothing
         returning *`,
        [
          tenant.schoolId,
          input.studentId,
          student.name,
          occurredAt,
          input.source === "biometric",
          input.deviceId ?? null,
          input.source,
          eventKey,
          input.type,
          actor?.id ?? input.recordedBy ?? null,
        ],
      );
      return attendance.rows[0] ?? { duplicate: true, eventKey };
    });

    if ("duplicate" in record) return record;

    const notificationStatus = await this.queueParentNotifications(tenant, input.studentId, input.type, occurredAt, input.adminOverride);
    await query(
      `update attendance_records set "parentNotificationStatus" = $3, "updatedAt" = now()
       where id = $1 and "schoolId" = $2`,
      [record.id, tenant.schoolId, notificationStatus],
    );

    await this.auditService.record(actor, { schoolId: tenant.schoolId }, {
      action: "attendance.event_recorded",
      entity: "attendance_records",
      entityId: String(record.id),
      riskLevel: "sensitive",
      summary: `Recorded ${input.type} attendance event`,
      metadata: { studentId: input.studentId, source: input.source, notificationStatus },
    });

    return { ...record, parentNotificationStatus: notificationStatus };
  }

  private async queueParentNotifications(
    tenant: { schoolId: string },
    studentId: string,
    type: "IN" | "OUT",
    occurredAt: string,
    adminOverride = false,
  ) {
    const duplicate = await query(
      `select id from notification_logs
       where "schoolId" = $1
         and "studentId" = $2
         and type = $3
         and "createdAt" >= now() - interval '10 minutes'
       limit 1`,
      [tenant.schoolId, studentId, `attendance_${type}`],
    );
    if (duplicate.rows.length) return "skipped";

    if (!adminOverride && !isWithinSchoolHours(occurredAt)) {
      await query(
        `insert into notification_review_queue ("schoolId", "studentId", type, payload)
         values ($1, $2, $3, $4::jsonb)`,
        [tenant.schoolId, studentId, `attendance_${type}`, JSON.stringify({ occurredAt, type })],
      );
      await query(
        `insert into notification_logs ("schoolId", "studentId", channel, type, status, "messageBody")
         values ($1, $2, 'in_app', $3, 'pending_approval', $4)`,
        [tenant.schoolId, studentId, `attendance_${type}`, `After-hours ${type} attendance event requires approval.`],
      );
      return "pending_approval";
    }

    const contacts = await query<{
      studentName: string;
      class: string;
      parentId: string | null;
      parentName: string | null;
      email: string | null;
      phone: string | null;
      whatsapp: string | null;
    }>(
      `select
         st.name as "studentName",
         st.class,
         p.id as "parentId",
         coalesce(p."fullName", st.parent) as "parentName",
         coalesce(p.email, st."parentEmail") as email,
         coalesce(p.phone, st."parentPhone") as phone,
         coalesce(p.whatsapp, st."parentWhatsApp") as whatsapp
       from students st
       left join student_parents sp on sp."schoolId" = st."schoolId" and sp."studentId" = st.id and sp."canReceiveAlerts" = true
       left join parents p on p.id = sp."parentId"
       where st."schoolId" = $1 and st.id = $2`,
      [tenant.schoolId, studentId],
    );
    const rows = contacts.rows;
    if (!rows.length) throw new AppError(404, "Student contacts not found");

    const sentTo = new Set<string>();
    let queued = 0;
    for (const contact of rows) {
      const messageBody = `Hi ${contact.parentName || "Parent"}, ${contact.studentName} of ${contact.class} has ${eventLabel(type).toLowerCase()} on ${formatKampala(occurredAt)}.`;
      const payload = {
        parent: contact.parentName,
        student: contact.studentName,
        className: contact.class,
        status: eventLabel(type),
        occurredAt,
        formattedTime: formatKampala(occurredAt),
        message: messageBody,
      };
      const targets = [
        { channel: "email" as const, recipient: contact.email },
        { channel: "sms" as const, recipient: contact.phone },
        { channel: "whatsapp" as const, recipient: contact.whatsapp },
      ];

      for (const target of targets) {
        if (!target.recipient || sentTo.has(`${target.channel}:${target.recipient}`)) continue;
        sentTo.add(`${target.channel}:${target.recipient}`);
        const job = await this.notificationService.queue(tenant, {
          type: `attendance_${type}`,
          channel: target.channel,
          recipient: target.recipient,
          template: "attendance_event",
          payload,
          idempotencyKey: `attendance:${studentId}:${type}:${target.channel}:${occurredAt}`,
        });
        await query(
          `insert into notification_logs (
             "schoolId", "studentId", "parentId", channel, type, recipient, status, "messageBody", "jobId"
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            tenant.schoolId,
            studentId,
            contact.parentId,
            target.channel,
            `attendance_${type}`,
            target.recipient,
            job ? "queued" : "skipped",
            messageBody,
            job?.id ?? null,
          ],
        );
        if (job) queued += 1;
      }
    }

    return queued > 0 ? "queued" : "skipped";
  }
}
