import "dotenv/config";
import { closePool, query } from "../infrastructure/database";

async function main() {
  const feeJobs = await query(
    `insert into notification_jobs (
       "schoolId", type, channel, recipient, template, payload, "idempotencyKey", "scheduledFor"
     )
     select
       st."schoolId",
       'fee_reminder',
       channel.name,
       case channel.name
         when 'email' then st."parentEmail"
         when 'sms' then st."parentPhone"
         else st."parentWhatsApp"
       end,
       'fee_reminder',
       jsonb_build_object(
         'parent', st.parent,
         'student', st.name,
         'balance', st."feesBalance",
         'term', fs.term,
         'dueDate', fs."dueDate"
       ),
       concat('fee:', st.id, ':', fs.id, ':', channel.name, ':', current_date),
       now()
     from students st
     join fee_structures fs on fs."schoolId" = st."schoolId" and fs."className" = st.class
     cross join (values ('email'), ('sms'), ('whatsapp')) as channel(name)
     where st."feesBalance" > 0
       and fs."dueDate" is not null
       and fs."dueDate" <= current_date + 7
       and case channel.name
         when 'email' then st."parentEmail"
         when 'sms' then st."parentPhone"
         else st."parentWhatsApp"
       end is not null
     on conflict ("schoolId", "idempotencyKey") where "idempotencyKey" is not null do nothing
     returning id`,
  );

  const overdueJobs = await query(
    `insert into notification_jobs (
       "schoolId", type, channel, recipient, template, payload, "idempotencyKey", "scheduledFor"
     )
     select
       b."schoolId",
       'library_overdue',
       channel.name,
       case channel.name
         when 'email' then st."parentEmail"
         when 'sms' then st."parentPhone"
         else st."parentWhatsApp"
       end,
       'library_overdue',
       jsonb_build_object('student', st.name, 'bookTitle', b."bookTitle", 'dueDate', b."dueDate"),
       concat('library:', b.id, ':', channel.name, ':', current_date),
       now()
     from borrowings b
     join students st on st.id = b."studentId" and st."schoolId" = b."schoolId"
     cross join (values ('email'), ('sms'), ('whatsapp')) as channel(name)
     where b.status = 'active' and b."dueDate" < current_date
       and case channel.name
         when 'email' then st."parentEmail"
         when 'sms' then st."parentPhone"
         else st."parentWhatsApp"
       end is not null
     on conflict ("schoolId", "idempotencyKey") where "idempotencyKey" is not null do nothing
     returning id`,
  );

  console.log(`Queued ${feeJobs.rowCount ?? 0} fee reminder(s) and ${overdueJobs.rowCount ?? 0} overdue alert(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closePool);
