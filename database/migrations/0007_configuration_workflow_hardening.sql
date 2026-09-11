alter table public.school_settings
  add column if not exists "currentTerm" text not null default 'Term 1';

update public.school_settings
set "currentTerm" = 'Term 1'
where nullif(trim("currentTerm"), '') is null;

alter table public.users
  add column if not exists "mustChangePassword" boolean not null default false,
  add column if not exists "passwordChangedAt" timestamptz;

alter table public.fee_structures
  add column if not exists active boolean not null default true,
  add column if not exists "createdBy" uuid references public.users(id) on delete set null,
  add column if not exists "updatedBy" uuid references public.users(id) on delete set null;

alter table public.subjects
  add column if not exists "schoolType" text check ("schoolType" in ('Primary', 'Secondary')),
  add column if not exists "classLevel" text;

-- Keep every historical row, but only the newest duplicate can remain operational.
with ranked as (
  select id,
         row_number() over (
           partition by "schoolId", lower(trim("className")), lower(trim(term)), lower(trim("academicYear"))
           order by "updatedAt" desc, "createdAt" desc, id desc
         ) as row_number
  from public.fee_structures
  where active = true
)
update public.fee_structures fs
set active = false, "updatedAt" = now()
from ranked
where fs.id = ranked.id and ranked.row_number > 1;

create unique index if not exists fee_structures_active_period_key
  on public.fee_structures (
    "schoolId",
    lower(trim("className")),
    lower(trim(term)),
    lower(trim("academicYear"))
  )
  where active = true;

-- Preserve legacy class fees by importing them into the current configured period.
insert into public.fee_structures (
  "schoolId", "className", term, "academicYear", items, "totalAmount", active
)
select
  ss."schoolId",
  legacy.class_name,
  ss."currentTerm",
  ss."academicYear",
  jsonb_build_array(jsonb_build_object('name', 'Legacy class fee', 'amount', legacy.amount)),
  legacy.amount,
  true
from public.school_settings ss
cross join lateral (
  select entry.key as class_name, trim(entry.value)::numeric(14,2) as amount
  from jsonb_each_text(coalesce(ss."classFees", '{}'::jsonb)) entry
  where entry.value ~ '^\s*[0-9]+([.][0-9]+)?\s*$'
    and trim(entry.value)::numeric > 0
) legacy
where not exists (
  select 1
  from public.fee_structures fs
  where fs."schoolId" = ss."schoolId"
    and lower(trim(fs."className")) = lower(trim(legacy.class_name))
    and lower(trim(fs.term)) = lower(trim(ss."currentTerm"))
    and lower(trim(fs."academicYear")) = lower(trim(ss."academicYear"))
    and fs.active = true
);

-- Normalize existing subject duplicates without destroying rows referenced by history.
with ranked as (
  select id,
         row_number() over (
           partition by "schoolId", lower(trim(name))
           order by active desc, "updatedAt" desc, "createdAt" desc, id desc
         ) as row_number
  from public.subjects
)
update public.subjects subject
set active = false, "updatedAt" = now()
from ranked
where subject.id = ranked.id and ranked.row_number > 1 and subject.active = true;

create unique index if not exists subjects_active_name_key
  on public.subjects ("schoolId", lower(trim(name)))
  where active = true;

alter table public.subjects drop constraint if exists "subjects_schoolId_name_key";

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

-- The public school identity and authenticated school selector must share one name.
update public.schools school
set name = settings.name, "updatedAt" = now()
from public.school_settings settings
where settings."schoolId" = school.id and school.name is distinct from settings.name;

create or replace view public.student_balances as
select
  st."schoolId",
  st.id as "studentId",
  st.name as "studentName",
  st.reg,
  st.class,
  coalesce(fee.standard_fee, 0)::numeric(14,2) as "standardFee",
  coalesce(paid.total_paid, 0)::numeric(14,2) as "paidAmount",
  greatest(coalesce(fee.standard_fee, 0) - coalesce(paid.total_paid, 0), 0)::numeric(14,2) as "outstandingAmount",
  case
    when coalesce(fee.standard_fee, 0) <= 0 then 'unconfigured'
    when coalesce(paid.total_paid, 0) >= coalesce(fee.standard_fee, 0) then 'paid'
    when coalesce(paid.total_paid, 0) > 0 then 'partial'
    else 'outstanding'
  end as status,
  ss."currentTerm" as term,
  ss."academicYear" as year,
  greatest(coalesce(paid.total_paid, 0) - coalesce(fee.standard_fee, 0), 0)::numeric(14,2) as "creditAmount"
from public.students st
join public.school_settings ss on ss."schoolId" = st."schoolId"
left join lateral (
  select fs."totalAmount" as standard_fee
  from public.fee_structures fs
  where fs."schoolId" = st."schoolId"
    and lower(trim(fs."className")) = lower(trim(st.class))
    and lower(trim(fs.term)) = lower(trim(ss."currentTerm"))
    and lower(trim(fs."academicYear")) = lower(trim(ss."academicYear"))
    and fs.active = true
  order by fs."updatedAt" desc
  limit 1
) fee on true
left join lateral (
  select coalesce(sum(fp.amount), 0) as total_paid
  from public.fee_payments fp
  where fp."schoolId" = st."schoolId"
    and fp."studentId" = st.id
    and lower(trim(fp.term)) = lower(trim(ss."currentTerm"))
    and lower(trim(fp.year)) = lower(trim(ss."academicYear"))
) paid on true;
