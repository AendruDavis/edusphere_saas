alter table public.marks
  add column if not exists "a1" numeric(5,2),
  add column if not exists "a2" numeric(5,2),
  add column if not exists "a3" numeric(5,2),
  add column if not exists "a4" numeric(5,2),
  add column if not exists "idf" numeric(5,2),
  add column if not exists "teacherInitials" text,
  add column if not exists locked boolean not null default false,
  add column if not exists "lockedAt" timestamptz,
  add column if not exists "lockedBy" uuid references public.users(id) on delete set null,
  add column if not exists "submittedAt" timestamptz,
  add column if not exists "submittedBy" uuid references public.users(id) on delete set null;

update public.marks
set
  "a1" = coalesce("a1", score),
  "a2" = coalesce("a2", score),
  "a3" = coalesce("a3", score),
  "a4" = coalesce("a4", score),
  "idf" = coalesce("idf", score)
where "a1" is null
  or "a2" is null
  or "a3" is null
  or "a4" is null
  or "idf" is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'marks_a1_range') then
    alter table public.marks add constraint marks_a1_range check ("a1" is null or ("a1" >= 0 and "a1" <= 100));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'marks_a2_range') then
    alter table public.marks add constraint marks_a2_range check ("a2" is null or ("a2" >= 0 and "a2" <= 100));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'marks_a3_range') then
    alter table public.marks add constraint marks_a3_range check ("a3" is null or ("a3" >= 0 and "a3" <= 100));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'marks_a4_range') then
    alter table public.marks add constraint marks_a4_range check ("a4" is null or ("a4" >= 0 and "a4" <= 100));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'marks_idf_range') then
    alter table public.marks add constraint marks_idf_range check ("idf" is null or ("idf" >= 0 and "idf" <= 100));
  end if;
end $$;

create table if not exists public.mark_audit_logs (
  id uuid primary key default gen_random_uuid(),
  "markId" uuid references public.marks(id) on delete set null,
  "studentId" uuid references public.students(id) on delete set null,
  subject text not null,
  term text not null,
  year text not null,
  action text not null check (action in ('create', 'update', 'lock', 'unlock', 'delete')),
  "changedBy" uuid references public.users(id) on delete set null,
  "oldValue" jsonb,
  "newValue" jsonb,
  "createdAt" timestamptz not null default now()
);

create index if not exists mark_audit_logs_mark_idx on public.mark_audit_logs ("markId", "createdAt");
create index if not exists marks_lookup_idx on public.marks ("studentId", subject, term, year);
