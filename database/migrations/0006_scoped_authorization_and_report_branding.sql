alter table public.users
  add column if not exists "platformRole" text;

alter table public.users drop constraint if exists users_platform_role_check;
alter table public.users add constraint users_platform_role_check
  check ("platformRole" is null or "platformRole" = 'super_admin');

update public.users
set "platformRole" = 'super_admin'
where role = 'super_admin' and "platformRole" is null;

alter table public.schools
  add column if not exists "authorizationMode" text not null default 'enforce';

alter table public.schools drop constraint if exists schools_authorization_mode_check;
alter table public.schools add constraint schools_authorization_mode_check
  check ("authorizationMode" in ('audit', 'enforce'));

-- Existing schools receive a review window. Newly-created schools enforce scopes immediately.
update public.schools set "authorizationMode" = 'audit';

create table if not exists public.school_membership_roles (
  id uuid primary key default gen_random_uuid(),
  "membershipId" uuid not null references public.school_memberships(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse')),
  "assignedBy" uuid references public.users(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  unique ("membershipId", role)
);

insert into public.school_membership_roles ("membershipId", role)
select sm.id, case when sm.role = 'super_admin' then 'admin' else sm.role end
from public.school_memberships sm
where sm.role in ('super_admin', 'admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse')
on conflict ("membershipId", role) do nothing;

update public.school_memberships set role = 'admin' where role = 'super_admin';

create table if not exists public.parent_user_links (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "parentId" uuid not null references public.parents(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  active boolean not null default true,
  "linkedBy" uuid references public.users(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", "parentId"),
  unique ("schoolId", "userId")
);

create table if not exists public.student_user_links (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "studentId" uuid not null references public.students(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  active boolean not null default true,
  "linkedBy" uuid references public.users(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", "studentId"),
  unique ("schoolId", "userId")
);

create table if not exists public.staff_user_links (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "staffId" uuid not null references public.staff(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  active boolean not null default true,
  "linkedBy" uuid references public.users(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("schoolId", "staffId"),
  unique ("schoolId", "userId")
);

create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  "academicYearId" uuid not null references public.academic_years(id) on delete cascade,
  "classId" uuid not null references public.school_classes(id) on delete cascade,
  "streamId" uuid references public.class_streams(id) on delete cascade,
  "subjectId" uuid references public.subjects(id) on delete cascade,
  "isClassTeacher" boolean not null default false,
  active boolean not null default true,
  "assignedBy" uuid references public.users(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create unique index if not exists teacher_assignments_scope_key
  on public.teacher_assignments (
    "schoolId", "userId", "academicYearId", "classId",
    coalesce("streamId", '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce("subjectId", '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists teacher_assignments_user_year_idx
  on public.teacher_assignments ("schoolId", "userId", "academicYearId", active);

create table if not exists public.support_access_sessions (
  id uuid primary key default gen_random_uuid(),
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "actorId" uuid not null references public.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  "expiresAt" timestamptz not null,
  "revokedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  check ("expiresAt" <= "createdAt" + interval '60 minutes')
);

create index if not exists support_access_active_idx
  on public.support_access_sessions ("actorId", "schoolId", "expiresAt")
  where "revokedAt" is null;

alter table public.school_settings
  add column if not exists "logoVariants" jsonb not null default '{}'::jsonb,
  add column if not exists "brandingVersion" integer not null default 1,
  add column if not exists "reportSettings" jsonb not null default '{
    "preset":"classic",
    "title":"END OF TERM PROGRESSIVE REPORT",
    "showLogo":true,
    "showStudentPhoto":true,
    "showPosition":true,
    "showAttendance":true,
    "showFees":false,
    "showHealth":false,
    "showLibrary":false,
    "classTeacherLabel":"Class Teacher",
    "headTeacherLabel":"Head Teacher"
  }'::jsonb;

alter table public.student_term_reports
  add column if not exists "currentRevision" integer not null default 0,
  add column if not exists "templateVersion" integer not null default 1;

create table if not exists public.student_term_report_revisions (
  id uuid primary key default gen_random_uuid(),
  "reportId" uuid not null references public.student_term_reports(id) on delete cascade,
  "schoolId" uuid not null references public.schools(id) on delete cascade,
  "studentId" uuid not null references public.students(id) on delete cascade,
  revision integer not null check (revision > 0),
  snapshot jsonb not null,
  "templateVersion" integer not null default 1,
  reason text,
  "finalizedBy" uuid references public.users(id) on delete set null,
  "finalizedAt" timestamptz not null default now(),
  unique ("reportId", revision)
);

create index if not exists report_revisions_student_period_idx
  on public.student_term_report_revisions ("schoolId", "studentId", revision desc);

-- Only exact, unique, same-school parent emails are safe to backfill automatically.
insert into public.parent_user_links ("schoolId", "parentId", "userId")
select candidate."schoolId", candidate."parentId", candidate."userId"
from (
  select p."schoolId", p.id as "parentId", u.id as "userId",
    count(*) over (partition by p."schoolId", lower(p.email)) as parent_matches,
    count(*) over (partition by sm."schoolId", lower(u.email)) as user_matches
  from public.parents p
  join public.users u on lower(u.email) = lower(p.email)
  join public.school_memberships sm
    on sm."schoolId" = p."schoolId" and sm."userId" = u.id and sm.active = true
  join public.school_membership_roles smr
    on smr."membershipId" = sm.id and smr.role = 'parent'
  where p.email is not null and trim(p.email) <> ''
) candidate
where candidate.parent_matches = 1 and candidate.user_matches = 1
on conflict do nothing;

-- Staff links use the same conservative exact-email rule.
insert into public.staff_user_links ("schoolId", "staffId", "userId")
select candidate."schoolId", candidate."staffId", candidate."userId"
from (
  select st."schoolId", st.id as "staffId", u.id as "userId",
    count(*) over (partition by st."schoolId", lower(st.email)) as staff_matches,
    count(*) over (partition by sm."schoolId", lower(u.email)) as user_matches
  from public.staff st
  join public.users u on lower(u.email) = lower(st.email)
  join public.school_memberships sm
    on sm."schoolId" = st."schoolId" and sm."userId" = u.id and sm.active = true
  where st.email is not null and trim(st.email) <> ''
    and exists (
      select 1 from public.school_membership_roles staff_role
      where staff_role."membershipId" = sm.id
        and staff_role.role in ('admin', 'teacher', 'accountant', 'staff', 'driver', 'librarian', 'nurse')
    )
) candidate
where candidate.staff_matches = 1 and candidate.user_matches = 1
on conflict do nothing;

drop trigger if exists parent_user_links_set_updated_at on public.parent_user_links;
create trigger parent_user_links_set_updated_at before update on public.parent_user_links
for each row execute function public.set_updated_at();

drop trigger if exists student_user_links_set_updated_at on public.student_user_links;
create trigger student_user_links_set_updated_at before update on public.student_user_links
for each row execute function public.set_updated_at();

drop trigger if exists staff_user_links_set_updated_at on public.staff_user_links;
create trigger staff_user_links_set_updated_at before update on public.staff_user_links
for each row execute function public.set_updated_at();

drop trigger if exists teacher_assignments_set_updated_at on public.teacher_assignments;
create trigger teacher_assignments_set_updated_at before update on public.teacher_assignments
for each row execute function public.set_updated_at();
