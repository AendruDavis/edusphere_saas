create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('super_admin', 'admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse'));

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('super_admin', 'admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse'));

alter table public.school_memberships drop constraint if exists school_memberships_role_check;
alter table public.school_memberships add constraint school_memberships_role_check
  check (role in ('super_admin', 'admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse'));

alter table public.notifications drop constraint if exists notifications_targetRole_check;
alter table public.notifications add constraint notifications_targetRole_check
  check ("targetRole" is null or "targetRole" in ('super_admin', 'admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse'));

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid references public.schools(id) on delete cascade,
  "actorId" uuid references public.users(id) on delete set null,
  action text not null,
  entity text not null,
  "entityId" text,
  "riskLevel" text not null default 'standard' check ("riskLevel" in ('standard', 'sensitive', 'restricted')),
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

create index if not exists audit_logs_school_action_idx on public.audit_logs ("schoolId", action, "createdAt");
create index if not exists audit_logs_entity_idx on public.audit_logs (entity, "entityId");

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "fullName" text not null,
  email text,
  phone text,
  whatsapp text,
  address text,
  "dataConsentAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint parents_contact_required check (email is not null or phone is not null or whatsapp is not null)
);

create unique index if not exists parents_school_email_key on public.parents ("schoolId", lower(email)) where email is not null;
create index if not exists parents_school_phone_idx on public.parents ("schoolId", phone) where phone is not null;

create table if not exists public.student_parents (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "studentId" uuid not null references public.students(id) on delete cascade,
  "parentId" uuid not null references public.parents(id) on delete cascade,
  relationship text not null default 'Guardian',
  "isPrimary" boolean not null default true,
  "canReceiveAlerts" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  unique ("schoolId", "studentId", "parentId")
);

create index if not exists student_parents_student_idx on public.student_parents ("schoolId", "studentId");

insert into public.parents ("schoolId", "fullName", email, phone, whatsapp, "dataConsentAt")
select distinct
  st."schoolId",
  coalesce(nullif(st.parent, ''), 'Parent / Guardian'),
  nullif(lower(st."parentEmail"), ''),
  nullif(st."parentPhone", ''),
  nullif(st."parentWhatsApp", ''),
  now()
from public.students st
where (st.parent is not null or st."parentEmail" is not null or st."parentPhone" is not null or st."parentWhatsApp" is not null)
on conflict do nothing;

insert into public.student_parents ("schoolId", "studentId", "parentId", relationship, "isPrimary", "canReceiveAlerts")
select st."schoolId", st.id, p.id, 'Guardian', true, true
from public.students st
join public.parents p on p."schoolId" = st."schoolId"
  and coalesce(lower(p.email), '') = coalesce(lower(st."parentEmail"), '')
where st."parentEmail" is not null
on conflict do nothing;

create table if not exists public.admissions (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "studentName" text not null,
  gender text,
  "dateOfBirth" date,
  "classApplied" text not null,
  status text not null default 'applied' check (status in ('applied', 'admitted', 'enrolled', 'rejected')),
  "parentName" text not null,
  "parentEmail" text,
  "parentPhone" text,
  "parentWhatsApp" text,
  documents jsonb not null default '{}'::jsonb,
  "admissionNo" text,
  "studentId" uuid references public.students(id) on delete set null,
  "createdBy" uuid references public.users(id) on delete set null,
  "reviewedBy" uuid references public.users(id) on delete set null,
  "reviewedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", "admissionNo")
);

create index if not exists admissions_school_status_idx on public.admissions ("schoolId", status, "createdAt");

create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "studentId" uuid not null references public.students(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  term text not null,
  year text not null,
  method text not null default 'Cash',
  "receiptNo" text not null,
  "paidAt" timestamptz not null default now(),
  description text,
  "recordedBy" uuid references public.users(id) on delete set null,
  "transactionId" uuid references public.transactions(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", "receiptNo")
);

create index if not exists fee_payments_student_period_idx on public.fee_payments ("schoolId", "studentId", term, year);

insert into public.fee_payments (
  "schoolId", "studentId", amount, term, year, method, "receiptNo", "paidAt", description, "transactionId"
)
select
  t."schoolId",
  t."studentId",
  t.amount,
  coalesce(nullif(t.description, ''), 'Term 1'),
  coalesce((select ss."academicYear" from public.school_settings ss where ss."schoolId" = t."schoolId" limit 1), '2026/2027'),
  'Imported',
  coalesce(nullif(t.reference, ''), 'LEGACY-' || right(t.id::text, 8)),
  coalesce(t.date::timestamptz, t."createdAt"),
  t.description,
  t.id
from public.transactions t
where t.type = 'income'
  and t."studentId" is not null
on conflict ("schoolId", "receiptNo") do nothing;

create or replace view public.student_balances as
select
  st."schoolId",
  st.id as "studentId",
  st.name as "studentName",
  st.reg,
  st.class,
  coalesce(fee.standard_fee, 0)::numeric(14,2) as "standardFee",
  coalesce(paid.total_paid, st."totalFeesPaid", 0)::numeric(14,2) as "paidAmount",
  greatest(coalesce(fee.standard_fee, 0) - coalesce(paid.total_paid, st."totalFeesPaid", 0), 0)::numeric(14,2) as "outstandingAmount",
  case
    when coalesce(fee.standard_fee, 0) <= 0 then 'unconfigured'
    when greatest(coalesce(fee.standard_fee, 0) - coalesce(paid.total_paid, st."totalFeesPaid", 0), 0) <= 0 then 'paid'
    when coalesce(paid.total_paid, st."totalFeesPaid", 0) > 0 then 'partial'
    else 'outstanding'
  end as status
from public.students st
join public.school_settings ss on ss."schoolId" = st."schoolId"
left join lateral (
  select coalesce(
    (select fs."totalAmount"
     from public.fee_structures fs
     where fs."schoolId" = st."schoolId" and fs."className" = st.class
     order by fs."updatedAt" desc
     limit 1),
    nullif(ss."classFees" ->> st.class, '')::numeric,
    0
  ) as standard_fee
) fee on true
left join lateral (
  select coalesce(sum(fp.amount), 0) as total_paid
  from public.fee_payments fp
  where fp."schoolId" = st."schoolId" and fp."studentId" = st.id
) paid on true;

create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "senderId" uuid references public.users(id) on delete set null,
  target text not null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'in_app', 'all')),
  subject text,
  body text not null,
  attachment jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'cancelled')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.communication_recipients (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "messageId" uuid not null references public.communication_messages(id) on delete cascade,
  "userId" uuid references public.users(id) on delete set null,
  "studentId" uuid references public.students(id) on delete set null,
  "parentId" uuid references public.parents(id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'in_app')),
  recipient text not null,
  status text not null default 'queued',
  "jobId" uuid references public.notification_jobs(id) on delete set null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "studentId" uuid references public.students(id) on delete set null,
  "parentId" uuid references public.parents(id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'in_app')),
  type text not null,
  recipient text,
  "sentAt" timestamptz,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped', 'pending_approval')),
  "messageBody" text,
  "jobId" uuid references public.notification_jobs(id) on delete set null,
  "createdAt" timestamptz not null default now()
);

create index if not exists notification_logs_student_type_idx on public.notification_logs ("schoolId", "studentId", type, "createdAt");

create table if not exists public.notification_review_queue (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "studentId" uuid references public.students(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  "createdAt" timestamptz not null default now(),
  "reviewedBy" uuid references public.users(id) on delete set null,
  "reviewedAt" timestamptz
);

alter table public.attendance_records
  add column if not exists "eventType" text check ("eventType" is null or "eventType" in ('IN', 'OUT')),
  add column if not exists "recordedBy" uuid references public.users(id) on delete set null,
  add column if not exists "parentNotificationStatus" text not null default 'not_required'
    check ("parentNotificationStatus" in ('not_required', 'queued', 'sent', 'failed', 'pending_approval', 'skipped'));

alter table public.health_records
  add column if not exists "actionTaken" text,
  add column if not exists "notifyParent" boolean not null default true,
  add column if not exists "parentNotifiedAt" timestamptz;

alter table public.leave_requests
  add column if not exists "reviewedBy" uuid references public.users(id) on delete set null,
  add column if not exists "reviewedAt" timestamptz,
  add column if not exists "expenseId" uuid references public.expenses(id) on delete set null;

create table if not exists public.staff_appraisals (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "staffId" uuid not null references public.staff(id) on delete cascade,
  term text not null,
  "lessonPlansSubmitted" numeric(6,2) not null default 0,
  "punctualityPercent" numeric(6,2) not null default 0,
  "studentResultsAverage" numeric(6,2) not null default 0,
  rating integer not null check (rating between 1 and 5),
  "overallScore" numeric(6,2) not null default 0,
  comment text,
  "createdBy" uuid references public.users(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists staff_appraisals_staff_term_idx on public.staff_appraisals ("schoolId", "staffId", term);

alter table public.subjects
  add column if not exists "schoolType" text check ("schoolType" is null or "schoolType" in ('Primary', 'Secondary')),
  add column if not exists "classLevel" text;

insert into public.subjects ("schoolId", name, code, "schoolType", "classLevel")
select s.id, subject.name, subject.code, subject.school_type, subject.class_level
from public.schools s
cross join (values
  ('English', 'ENG', 'Primary', 'P.1-P.7'),
  ('Mathematics', 'MATH', 'Primary', 'P.1-P.7'),
  ('Science', 'SCI', 'Primary', 'P.1-P.7'),
  ('Social Studies', 'SST', 'Primary', 'P.1-P.7'),
  ('Religious Education', 'RE', 'Primary', 'P.1-P.7'),
  ('English Language', 'ENG', 'Secondary', 'S.1-S.6'),
  ('Mathematics', 'MATH', 'Secondary', 'S.1-S.6'),
  ('Biology', 'BIO', 'Secondary', 'S.1-S.6'),
  ('Chemistry', 'CHEM', 'Secondary', 'S.1-S.6'),
  ('Physics', 'PHY', 'Secondary', 'S.1-S.6'),
  ('History', 'HIST', 'Secondary', 'S.1-S.6'),
  ('Geography', 'GEO', 'Secondary', 'S.1-S.6'),
  ('CRE', 'CRE', 'Secondary', 'S.1-S.6'),
  ('Agriculture', 'AGR', 'Secondary', 'S.1-S.6'),
  ('Computer Studies', 'COMP', 'Secondary', 'S.1-S.6'),
  ('Entrepreneurship', 'ENT', 'Secondary', 'S.1-S.6')
) as subject(name, code, school_type, class_level)
on conflict ("schoolId", name) do nothing;

drop trigger if exists parents_set_updated_at on public.parents;
create trigger parents_set_updated_at before update on public.parents for each row execute function public.set_updated_at();
drop trigger if exists admissions_set_updated_at on public.admissions;
create trigger admissions_set_updated_at before update on public.admissions for each row execute function public.set_updated_at();
drop trigger if exists fee_payments_set_updated_at on public.fee_payments;
create trigger fee_payments_set_updated_at before update on public.fee_payments for each row execute function public.set_updated_at();
drop trigger if exists communication_messages_set_updated_at on public.communication_messages;
create trigger communication_messages_set_updated_at before update on public.communication_messages for each row execute function public.set_updated_at();
drop trigger if exists staff_appraisals_set_updated_at on public.staff_appraisals;
create trigger staff_appraisals_set_updated_at before update on public.staff_appraisals for each row execute function public.set_updated_at();
