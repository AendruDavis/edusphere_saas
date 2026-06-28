import "dotenv/config";
import { closePool, query, withTransaction } from "../infrastructure/database";
import { createNotificationProvider } from "../infrastructure/notificationProviders";
import type { NotificationChannel } from "../domain/providers";

type Job = {
  id: string;
  schoolId: string;
  type: string;
  channel: NotificationChannel;
  recipient: string;
  template: string;
  payload: Record<string, unknown>;
  attempts: number;
};

function render(job: Job) {
  const payload = job.payload || {};
  if (job.template === "attendance_check_in") {
    return `${payload.student} reported to school at ${new Date(String(payload.occurredAt)).toLocaleString("en-UG", { timeZone: "Africa/Kampala" })}.`;
  }
  if (job.template === "sickbay_visit") {
    return `${payload.student} was attended to in Sickbay for ${payload.diagnosis}.`;
  }
  if (job.template === "fee_reminder") {
    return `Dear ${payload.parent || "Parent"}, ${payload.student} has UGX ${payload.balance} outstanding for ${payload.term}. Due: ${payload.dueDate}.`;
  }
  if (job.template === "library_overdue") {
    return `${payload.student} has an overdue library book: ${payload.bookTitle}. Due date: ${payload.dueDate}.`;
  }
  return String(payload.message || job.type);
}

async function claimJobs() {
  return withTransaction(async (client) => {
    const result = await client.query<Job>(
      `select id, "schoolId", type, channel, recipient, template, payload, attempts
       from notification_jobs
       where status in ('pending', 'failed') and "scheduledFor" <= now() and attempts < 5
       order by "scheduledFor"
       for update skip locked
       limit 25`,
    );
    if (result.rows.length) {
      await client.query(
        `update notification_jobs set status = 'processing', attempts = attempts + 1, "updatedAt" = now()
         where id = any($1::uuid[])`,
        [result.rows.map((job) => job.id)],
      );
    }
    return result.rows;
  });
}

async function main() {
  const jobs = await claimJobs();
  for (const job of jobs) {
    try {
      const provider = createNotificationProvider(job.channel, job.schoolId);
      const delivery = await provider.send({
        channel: job.channel,
        recipient: job.recipient,
        subject: "EduSphere notification",
        body: render(job),
      });
      await query(
        `with delivery as (
           insert into notification_deliveries ("schoolId", "jobId", provider, status, response)
           values ($1, $2, $3, 'sent', $4::jsonb)
         )
         update notification_jobs set status = 'sent', "lastError" = null, "updatedAt" = now() where id = $2`,
        [job.schoolId, job.id, delivery.provider, JSON.stringify(delivery.response ?? {})],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delivery failed";
      await query(
        `with delivery as (
           insert into notification_deliveries ("schoolId", "jobId", provider, status, response)
           values ($1, $2, $3, 'failed', $4::jsonb)
         )
         update notification_jobs set status = 'failed', "lastError" = $5, "updatedAt" = now() where id = $2`,
        [job.schoolId, job.id, job.channel, JSON.stringify({ error: message }), message],
      );
    }
  }
  console.log(`Processed ${jobs.length} notification job(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closePool);
