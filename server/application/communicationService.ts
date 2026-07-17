import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query } from "../infrastructure/database";
import type { NotificationChannel } from "../domain/providers";
import { AuditService } from "./auditService";
import { NotificationService } from "./notificationService";

export type CommunicationTarget = "all_parents" | "all_staff" | "specific_class" | "specific_recipient";

export type CommunicationInput = {
  to: CommunicationTarget;
  channel: NotificationChannel | "all";
  className?: string;
  recipient?: string;
  subject?: string;
  body: string;
  attachment?: Record<string, unknown>;
};

type Recipient = {
  userId?: string | null;
  studentId?: string | null;
  parentId?: string | null;
  channel: NotificationChannel;
  recipient: string;
};

const outboundChannels: NotificationChannel[] = ["email", "sms", "whatsapp"];

function channelsFor(channel: NotificationChannel | "all") {
  return channel === "all" ? outboundChannels : [channel];
}

export class CommunicationService {
  constructor(
    private readonly notificationService = new NotificationService(),
    private readonly auditService = new AuditService(),
  ) {}

  async history(tenant: TenantContext) {
    const result = await query(
      `select cm.*,
        coalesce(jsonb_agg(to_jsonb(cr) order by cr."createdAt") filter (where cr.id is not null), '[]'::jsonb) as recipients
       from communication_messages cm
       left join communication_recipients cr on cr."messageId" = cm.id and cr."schoolId" = cm."schoolId"
       where cm."schoolId" = $1
       group by cm.id
       order by cm."createdAt" desc
       limit 100`,
      [tenant.schoolId],
    );
    return result.rows;
  }

  async send(actor: AuthUser, tenant: TenantContext, input: CommunicationInput) {
    const recipients = await this.resolveRecipients(tenant, input);
    const messageResult = await query(
      `insert into communication_messages (
         "schoolId", "senderId", target, channel, subject, body, attachment
       ) values ($1, $2, $3, $4, $5, $6, $7::jsonb)
       returning *`,
      [
        tenant.schoolId,
        actor.id,
        input.to === "specific_class" ? `${input.to}:${input.className}` : input.to,
        input.channel,
        input.subject ?? null,
        input.body,
        JSON.stringify(input.attachment ?? null),
      ],
    );
    const message = messageResult.rows[0];

    for (const recipient of recipients) {
      const job = await this.notificationService.queue(tenant, {
        type: "communication",
        channel: recipient.channel,
        recipient: recipient.recipient,
        template: "communication",
        payload: {
          subject: input.subject,
          message: input.body,
          attachment: input.attachment ?? null,
        },
        idempotencyKey: `communication:${message.id}:${recipient.channel}:${recipient.recipient}`,
      });
      await query(
        `insert into communication_recipients (
           "schoolId", "messageId", "userId", "studentId", "parentId", channel, recipient, status, "jobId"
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tenant.schoolId,
          message.id,
          recipient.userId ?? null,
          recipient.studentId ?? null,
          recipient.parentId ?? null,
          recipient.channel,
          recipient.recipient,
          job ? "queued" : "skipped",
          job?.id ?? null,
        ],
      );
    }

    await this.auditService.record(actor, tenant, {
      action: "communication.sent",
      entity: "communication_messages",
      entityId: String(message.id),
      riskLevel: "sensitive",
      summary: `Queued communication to ${recipients.length} recipient channel(s)`,
      metadata: { target: input.to, channel: input.channel },
    });

    return { message, recipientCount: recipients.length };
  }

  private async resolveRecipients(tenant: TenantContext, input: CommunicationInput): Promise<Recipient[]> {
    const channels = channelsFor(input.channel);
    if (input.to === "specific_recipient") {
      return input.recipient
        ? channels.map((channel) => ({ channel, recipient: input.recipient! }))
        : [];
    }

    if (input.to === "all_staff") {
      const staffResult = await query<{ userId: string; email: string }>(
        `select u.id as "userId", u.email
         from school_memberships sm
         join users u on u.id = sm."userId"
         where sm."schoolId" = $1
           and sm.active = true
           and sm.role not in ('student', 'parent')
           and u.email is not null`,
        [tenant.schoolId],
      );
      return staffResult.rows.flatMap((row) =>
        channels
          .filter((channel) => channel === "email" || channel === "in_app")
          .map((channel) => ({
            userId: row.userId,
            channel,
            recipient: channel === "in_app" ? row.userId : row.email,
          })),
      );
    }

    const classFilter = input.to === "specific_class" ? `and st.class = $2` : "";
    const params = input.to === "specific_class" ? [tenant.schoolId, input.className] : [tenant.schoolId];
    const parentResult = await query<{
      studentId: string;
      parentId: string | null;
      parentEmail: string | null;
      parentPhone: string | null;
      parentWhatsApp: string | null;
    }>(
      `select
         st.id as "studentId",
         p.id as "parentId",
         coalesce(p.email, st."parentEmail") as "parentEmail",
         coalesce(p.phone, st."parentPhone") as "parentPhone",
         coalesce(p.whatsapp, st."parentWhatsApp") as "parentWhatsApp"
       from students st
       left join student_parents sp on sp."schoolId" = st."schoolId" and sp."studentId" = st.id and sp."canReceiveAlerts" = true
       left join parents p on p.id = sp."parentId"
       where st."schoolId" = $1 ${classFilter}`,
      params,
    );

    return parentResult.rows.flatMap((row) =>
      channels.flatMap((channel) => {
        const recipient =
          channel === "email" ? row.parentEmail :
          channel === "sms" ? row.parentPhone :
          channel === "whatsapp" ? row.parentWhatsApp :
          null;
        return recipient ? [{ studentId: row.studentId, parentId: row.parentId, channel, recipient }] : [];
      }),
    );
  }
}
