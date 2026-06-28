create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

insert into public.schools (name, slug)
select coalesce((select name from public.school_settings limit 1), 'EduSphere Academy'), 'default-school'
where not exists (select 1 from public.schools);

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse')),
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", "userId")
);

insert into public.school_memberships ("schoolId", "userId", role)
select (select id from public.schools order by "createdAt" limit 1), u.id, coalesce(ur.role, u.role)
from public.users u
left join public.user_roles ur on ur."userId" = u.id and ur.active = true
on conflict ("schoolId", "userId") do nothing;

alter table public.school_settings
  add column if not exists "schoolId" uuid references public.schools(id) on delete cascade,
  add column if not exists motto text,
  add column if not exists "deoCode" text,
  add column if not exists tin text,
  add column if not exists "primaryColor" text not null default '#0066CC',
  add column if not exists "secondaryColor" text not null default '#009900',
  add column if not exists "bankName" text,
  add column if not exists "bankAccount" text,
  add column if not exists "payCode" text,
  add column if not exists "reportFooter" text,
  add column if not exists "stampWarning" text not null default 'Not Valid without school Official Stamp',
  add column if not exists "assessmentModel" text not null default 'percentage_100'
    check ("assessmentModel" in ('competency_3', 'percentage_100'));

update public.school_settings
set "schoolId" = (select id from public.schools order by "createdAt" limit 1)
where "schoolId" is null;

alter table public.school_settings alter column "schoolId" set not null;
alter table public.school_settings drop constraint if exists school_settings_pkey;
alter table public.school_settings add constraint school_settings_pkey primary key ("schoolId");

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'students', 'staff', 'leave_requests', 'books', 'borrowings', 'health_records',
    'marks', 'inventory', 'transactions', 'expenses', 'fee_structures',
    'attendance_records', 'vehicles', 'routes', 'timetable_entries', 'dormitories',
    'dorm_rooms', 'dorm_allocations', 'notifications', 'mark_audit_logs'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists "schoolId" uuid references public.schools(id) on delete cascade',
      table_name
    );
    execute format(
      'update public.%I set "schoolId" = (select id from public.schools order by "createdAt" limit 1) where "schoolId" is null',
      table_name
    );
    execute format('alter table public.%I alter column "schoolId" set not null', table_name);
    execute format('create index if not exists %I on public.%I ("schoolId")', table_name || '_school_idx', table_name);
  end loop;
end $$;

alter table public.students
  add column if not exists lin text,
  add column if not exists "payCode" text,
  add column if not exists "parentWhatsApp" text,
  add column if not exists "biometricReference" text;

update public.students set lin = reg where lin is null;
alter table public.students drop constraint if exists students_reg_key;
create unique index if not exists students_school_reg_key on public.students ("schoolId", reg);
create unique index if not exists students_school_lin_key on public.students ("schoolId", lin) where lin is not null;

alter table public.staff drop constraint if exists staff_employeeId_key;
create unique index if not exists staff_school_employee_key on public.staff ("schoolId", "employeeId");

alter table public.vehicles drop constraint if exists vehicles_plateNumber_key;
create unique index if not exists vehicles_school_plate_key on public.vehicles ("schoolId", "plateNumber");

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  name text not null,
  active boolean not null default false,
  "startDate" date,
  "endDate" date,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", name)
);

create table if not exists public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "academicYearId" uuid not null references public.academic_years(id) on delete cascade,
  name text not null,
  "opensOn" date,
  "closesOn" date,
  "expectedSchoolDays" integer not null default 0 check ("expectedSchoolDays" >= 0),
  active boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", "academicYearId", name)
);

create table if not exists public.school_classes (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  name text not null,
  level integer,
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", name)
);

create table if not exists public.class_streams (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "classId" uuid not null references public.school_classes(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("classId", name)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text,
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", name)
);

create table if not exists public.grading_policies (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  name text not null,
  version integer not null default 1,
  model text not null check (model in ('competency_3', 'percentage_100')),
  "maxAssessmentScore" numeric(6,2) not null,
  "courseworkWeight" numeric(5,2) not null default 20,
  "examWeight" numeric(5,2) not null default 80,
  "gradeBands" jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", name, version)
);

insert into public.grading_policies (
  "schoolId", name, model, "maxAssessmentScore", "gradeBands"
)
select
  ss."schoolId",
  'Default Percentage Policy',
  'percentage_100',
  100,
  ss."gradingScale"
from public.school_settings ss
where not exists (
  select 1 from public.grading_policies gp where gp."schoolId" = ss."schoolId"
);

alter table public.marks
  add column if not exists "examScore" numeric(5,2),
  add column if not exists "gradingPolicyId" uuid references public.grading_policies(id) on delete set null,
  add column if not exists "assessmentModel" text check ("assessmentModel" in ('competency_3', 'percentage_100')),
  add column if not exists "courseworkScore" numeric(5,2),
  add column if not exists "examWeightedScore" numeric(5,2),
  add column if not exists "finalScore" numeric(5,2),
  add column if not exists identifier integer,
  add column if not exists "policySnapshot" jsonb;

update public.marks m
set
  "examScore" = coalesce(m."examScore", m.idf, m.score),
  "gradingPolicyId" = coalesce(
    m."gradingPolicyId",
    (select gp.id from public.grading_policies gp where gp."schoolId" = m."schoolId" and gp.active order by gp.version desc limit 1)
  ),
  "assessmentModel" = coalesce(m."assessmentModel", 'percentage_100'),
  "courseworkScore" = coalesce(m."courseworkScore", round(((coalesce(m.a1, m.score) + coalesce(m.a2, m.score) + coalesce(m.a3, m.score) + coalesce(m.a4, m.score)) / 4 * 0.2)::numeric, 2)),
  "examWeightedScore" = coalesce(m."examWeightedScore", round((coalesce(m.idf, m.score) * 0.8)::numeric, 2)),
  "finalScore" = coalesce(m."finalScore", m.score),
  "policySnapshot" = coalesce(m."policySnapshot", '{"model":"percentage_100","courseworkWeight":20,"examWeight":80,"migrated":true}'::jsonb);

create table if not exists public.student_term_reports (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "studentId" uuid not null references public.students(id) on delete cascade,
  "academicYearId" uuid references public.academic_years(id) on delete set null,
  "termId" uuid references public.academic_terms(id) on delete set null,
  "termName" text not null,
  "yearName" text not null,
  "classTeacherComment" text,
  "headTeacherComment" text,
  "projectWork" text,
  result text,
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  snapshot jsonb,
  "finalizedAt" timestamptz,
  "finalizedBy" uuid references public.users(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", "studentId", "termName", "yearName")
);

alter table public.borrowings
  add column if not exists "bookId" uuid references public.books(id) on delete restrict,
  add column if not exists "returnedAt" timestamptz;

update public.borrowings loan
set "bookId" = book.id
from public.books book
where loan."bookId" is null
  and book."schoolId" = loan."schoolId"
  and lower(book.title) = lower(loan."bookTitle");

alter table public.health_records
  add column if not exists diagnosis text,
  add column if not exists "visitAt" timestamptz,
  add column if not exists "nurseId" uuid references public.users(id) on delete set null;

update public.health_records
set diagnosis = coalesce(diagnosis, sickness),
    "visitAt" = coalesce("visitAt", date::timestamptz)
where diagnosis is null or "visitAt" is null;

alter table public.attendance_records
  add column if not exists "studentRefId" uuid references public.students(id) on delete cascade,
  add column if not exists "staffRefId" uuid references public.staff(id) on delete cascade,
  add column if not exists "checkInAt" timestamptz,
  add column if not exists source text not null default 'manual',
  add column if not exists "idempotencyKey" text;

update public.attendance_records ar
set "studentRefId" = s.id
from public.students s
where ar.role = 'Student'
  and ar."studentRefId" is null
  and ar."studentId" = s.id::text
  and ar."schoolId" = s."schoolId";

update public.attendance_records
set "checkInAt" = coalesce("checkInAt", date::timestamptz)
where "checkInAt" is null;

create unique index if not exists attendance_idempotency_key
  on public.attendance_records ("schoolId", "idempotencyKey")
  where "idempotencyKey" is not null;

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  type text not null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'in_app')),
  recipient text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  "scheduledFor" timestamptz not null default now(),
  attempts integer not null default 0,
  "idempotencyKey" text,
  "lastError" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create unique index if not exists notification_jobs_idempotency_key
  on public.notification_jobs ("schoolId", "idempotencyKey")
  where "idempotencyKey" is not null;

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "jobId" uuid not null references public.notification_jobs(id) on delete cascade,
  provider text,
  status text not null,
  response jsonb,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "studentId" uuid not null references public.students(id) on delete cascade,
  "invoiceNumber" text not null,
  term text not null,
  year text not null,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0,
  vat numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  status text not null default 'issued',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", "invoiceNumber")
);

create table if not exists public.biometric_events (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "studentId" uuid references public.students(id) on delete cascade,
  "deviceId" text not null,
  "eventKey" text not null,
  "occurredAt" timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  unique ("schoolId", "eventKey")
);

create index if not exists school_memberships_user_idx on public.school_memberships ("userId", active);
create index if not exists reports_student_term_idx on public.student_term_reports ("schoolId", "studentId", "termName", "yearName");
create index if not exists marks_school_student_term_idx on public.marks ("schoolId", "studentId", term, year);
