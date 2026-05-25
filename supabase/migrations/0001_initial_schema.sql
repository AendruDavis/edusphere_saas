create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-assets', 'school-assets', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse')),
  photo text,
  dept text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse')),
  active boolean not null default true,
  "assignedBy" uuid references public.users(id) on delete set null,
  "assignedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.school_settings (
  id boolean primary key default true check (id),
  name text not null default 'EduSphere Academy',
  logo text,
  level text not null default 'Primary' check (level in ('Primary', 'Secondary')),
  classes jsonb not null default '["Baby Class","Middle Class","Top Class","P.1","P.2","P.3","P.4","P.5","P.6","P.7"]'::jsonb,
  currency text not null default 'UGX',
  "academicYear" text not null default '2026/2027',
  address text,
  phone text,
  email text,
  "classFees" jsonb not null default '{}'::jsonb,
  "gradingScale" jsonb not null default '[{"min":80,"grade":"D1","comment":"Distinction 1"},{"min":75,"grade":"D2","comment":"Distinction 2"},{"min":70,"grade":"C3","comment":"Credit 3"},{"min":65,"grade":"C4","comment":"Credit 4"},{"min":60,"grade":"C5","comment":"Credit 5"},{"min":55,"grade":"C6","comment":"Pass"},{"min":0,"grade":"F9","comment":"Fail"}]'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

insert into public.school_settings (id) values (true)
on conflict (id) do nothing;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  reg text not null unique,
  class text not null,
  section text,
  parent text,
  "parentPhone" text,
  "parentEmail" text,
  address text,
  photo text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended', 'graduated')),
  "feesBalance" numeric(14,2) not null default 0,
  "totalFeesPaid" numeric(14,2) not null default 0,
  "admissionDate" date,
  gender text,
  "dateOfBirth" date,
  "fingerprintId" text unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  "employeeId" text not null unique,
  name text not null,
  role text not null,
  department text not null,
  salary numeric(14,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'on-leave', 'terminated')),
  email text,
  phone text,
  "joinDate" date,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  "staffId" uuid references public.staff(id) on delete cascade,
  "staffName" text not null,
  "startDate" date not null,
  "endDate" date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  type text not null check (type in ('sick', 'vacation', 'emergency', 'other')),
  "appliedDate" date not null default current_date,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  category text not null,
  isbn text not null,
  available integer not null default 0 check (available >= 0),
  total integer not null default 0 check (total >= 0),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.borrowings (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid references public.students(id) on delete cascade,
  "studentName" text not null,
  "bookTitle" text not null,
  "borrowDate" date not null,
  "dueDate" date not null,
  status text not null default 'active' check (status in ('active', 'returned', 'overdue')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid references public.students(id) on delete cascade,
  "studentName" text not null,
  sickness text not null,
  medication text not null,
  status text not null default 'sick' check (status in ('sick', 'sent-home', 'back-in-class', 'monitored')),
  date date not null default current_date,
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.marks (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid references public.students(id) on delete cascade,
  subject text not null,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  term text not null,
  year text not null,
  comment text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(14,2) not null default 0,
  quantity numeric(14,2) not null default 0,
  unit text not null default 'unit',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  date date not null default current_date,
  status text not null default 'completed',
  "studentId" uuid references public.students(id) on delete set null,
  reference text,
  description text,
  currency text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null,
  date date not null default current_date,
  "paidBy" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  "className" text not null,
  term text not null,
  "academicYear" text not null,
  items jsonb not null default '[]'::jsonb,
  "totalAmount" numeric(14,2) not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  "studentId" text not null,
  "studentName" text not null,
  date date not null default current_date,
  status text not null check (status in ('present', 'absent', 'late')),
  role text not null default 'Student' check (role in ('Student', 'Staff')),
  "biometricVerified" boolean not null default false,
  "deviceId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  "plateNumber" text not null unique,
  model text not null,
  "driverId" uuid references public.staff(id) on delete set null,
  "driverName" text not null,
  capacity integer not null default 0,
  status text not null default 'active' check (status in ('active', 'maintenance', 'inactive')),
  "lastLocation" jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stops jsonb not null default '[]'::jsonb,
  "vehicleId" uuid references public.vehicles(id) on delete set null,
  "morningStartTime" text not null,
  "eveningStartTime" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  day text not null check (day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  "startTime" text not null,
  "endTime" text not null,
  subject text not null,
  "teacherId" uuid references public.staff(id) on delete set null,
  "teacherName" text not null,
  class text not null,
  room text not null,
  type text default 'class' check (type in ('class', 'exam')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.dormitories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer not null default 0,
  gender text not null default 'Mixed' check (gender in ('Male', 'Female', 'Mixed')),
  rooms jsonb not null default '[]'::jsonb,
  "wardenName" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.dorm_rooms (
  id uuid primary key default gen_random_uuid(),
  "dormId" uuid not null references public.dormitories(id) on delete cascade,
  "roomNumber" text not null,
  capacity integer not null default 1,
  occupants jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("dormId", "roomNumber")
);

create table public.dorm_allocations (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid not null references public.students(id) on delete cascade,
  "studentName" text not null,
  "dormId" uuid not null references public.dormitories(id) on delete cascade,
  "roomId" uuid not null references public.dorm_rooms(id) on delete cascade,
  "allocationDate" date not null default current_date,
  status text not null default 'active' check (status in ('active', 'checked-out')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null default 'all',
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'warning', 'error', 'success')),
  "targetRole" text check ("targetRole" is null or "targetRole" in ('admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse')),
  read boolean not null default false,
  timestamp timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index students_class_idx on public.students (class);
create index users_role_idx on public.users (role);
create unique index user_roles_one_active_role_idx on public.user_roles ("userId") where active;
create index user_roles_user_idx on public.user_roles ("userId", active);
create index transactions_student_idx on public.transactions ("studentId");
create index attendance_student_date_idx on public.attendance_records ("studentId", date);
create index dorm_allocations_student_idx on public.dorm_allocations ("studentId");
create index notifications_target_idx on public.notifications ("userId", "targetRole", read);

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger user_roles_set_updated_at before update on public.user_roles for each row execute function public.set_updated_at();
create trigger school_settings_set_updated_at before update on public.school_settings for each row execute function public.set_updated_at();
create trigger students_set_updated_at before update on public.students for each row execute function public.set_updated_at();
create trigger staff_set_updated_at before update on public.staff for each row execute function public.set_updated_at();
create trigger leave_requests_set_updated_at before update on public.leave_requests for each row execute function public.set_updated_at();
create trigger books_set_updated_at before update on public.books for each row execute function public.set_updated_at();
create trigger borrowings_set_updated_at before update on public.borrowings for each row execute function public.set_updated_at();
create trigger health_records_set_updated_at before update on public.health_records for each row execute function public.set_updated_at();
create trigger marks_set_updated_at before update on public.marks for each row execute function public.set_updated_at();
create trigger inventory_set_updated_at before update on public.inventory for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();
create trigger fee_structures_set_updated_at before update on public.fee_structures for each row execute function public.set_updated_at();
create trigger attendance_records_set_updated_at before update on public.attendance_records for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger routes_set_updated_at before update on public.routes for each row execute function public.set_updated_at();
create trigger timetable_entries_set_updated_at before update on public.timetable_entries for each row execute function public.set_updated_at();
create trigger dormitories_set_updated_at before update on public.dormitories for each row execute function public.set_updated_at();
create trigger dorm_rooms_set_updated_at before update on public.dorm_rooms for each row execute function public.set_updated_at();
create trigger dorm_allocations_set_updated_at before update on public.dorm_allocations for each row execute function public.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications for each row execute function public.set_updated_at();

create or replace function public.record_transaction(transaction_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.transactions%rowtype;
  tx_amount numeric(14,2) := coalesce(nullif(transaction_input->>'amount', '')::numeric, 0);
  tx_student_id uuid := nullif(transaction_input->>'studentId', '')::uuid;
begin
  insert into public.transactions (
    type,
    category,
    amount,
    date,
    status,
    "studentId",
    reference,
    description,
    currency
  )
  values (
    coalesce(transaction_input->>'type', 'income'),
    coalesce(transaction_input->>'category', 'General'),
    tx_amount,
    coalesce(nullif(transaction_input->>'date', '')::date, current_date),
    coalesce(transaction_input->>'status', 'completed'),
    tx_student_id,
    nullif(transaction_input->>'reference', ''),
    nullif(transaction_input->>'description', ''),
    nullif(transaction_input->>'currency', '')
  )
  returning * into inserted;

  if inserted.type = 'income' and inserted."studentId" is not null then
    update public.students
    set "totalFeesPaid" = coalesce("totalFeesPaid", 0) + tx_amount
    where id = inserted."studentId";
  end if;

  return to_jsonb(inserted);
end;
$$;

create or replace function public.record_expense(expense_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.expenses%rowtype;
begin
  insert into public.expenses (
    description,
    amount,
    category,
    date,
    "paidBy"
  )
  values (
    coalesce(expense_input->>'description', 'Expense'),
    coalesce(nullif(expense_input->>'amount', '')::numeric, 0),
    coalesce(expense_input->>'category', 'General'),
    coalesce(nullif(expense_input->>'date', '')::date, current_date),
    coalesce(expense_input->>'paidBy', 'System')
  )
  returning * into inserted;

  insert into public.transactions (
    type,
    category,
    amount,
    date,
    status,
    reference,
    description
  )
  values (
    'expense',
    inserted.category,
    inserted.amount,
    inserted.date,
    'completed',
    'EXP-' || right(inserted.id::text, 8),
    inserted.description
  );

  return to_jsonb(inserted);
end;
$$;

create or replace function public.record_biometric_check_in(check_in jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_student public.students%rowtype;
  inserted public.attendance_records%rowtype;
begin
  select *
  into matched_student
  from public.students
  where "fingerprintId" = check_in->>'fingerprintId'
  limit 1;

  if matched_student.id is null then
    raise exception 'No student matched this fingerprint';
  end if;

  insert into public.attendance_records (
    "studentId",
    "studentName",
    date,
    status,
    role,
    "biometricVerified",
    "deviceId"
  )
  values (
    matched_student.id,
    matched_student.name,
    coalesce(nullif(check_in->>'date', '')::date, current_date),
    coalesce(check_in->>'status', 'present'),
    'Student',
    true,
    nullif(check_in->>'deviceId', '')
  )
  returning * into inserted;

  return to_jsonb(inserted);
end;
$$;

create or replace function public.update_vehicle_location(location_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.vehicles%rowtype;
begin
  update public.vehicles
  set "lastLocation" = jsonb_build_object(
    'lat', (location_input->>'lat')::numeric,
    'lng', (location_input->>'lng')::numeric,
    'lastUpdate', coalesce(location_input->>'lastUpdate', now()::text)
  )
  where id = nullif(location_input->>'vehicleId', '')::uuid
     or "plateNumber" = location_input->>'plateNumber'
  returning * into updated;

  if updated.id is null then
    raise exception 'Vehicle not found';
  end if;

  return to_jsonb(updated);
end;
$$;

alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.school_settings enable row level security;
alter table public.students enable row level security;
alter table public.staff enable row level security;
alter table public.leave_requests enable row level security;
alter table public.books enable row level security;
alter table public.borrowings enable row level security;
alter table public.health_records enable row level security;
alter table public.marks enable row level security;
alter table public.inventory enable row level security;
alter table public.transactions enable row level security;
alter table public.expenses enable row level security;
alter table public.fee_structures enable row level security;
alter table public.attendance_records enable row level security;
alter table public.vehicles enable row level security;
alter table public.routes enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.dormitories enable row level security;
alter table public.dorm_rooms enable row level security;
alter table public.dorm_allocations enable row level security;
alter table public.notifications enable row level security;

revoke execute on function public.record_transaction(jsonb) from public, anon, authenticated;
revoke execute on function public.record_expense(jsonb) from public, anon, authenticated;
revoke execute on function public.record_biometric_check_in(jsonb) from public, anon, authenticated;
revoke execute on function public.update_vehicle_location(jsonb) from public, anon, authenticated;
grant execute on function public.record_transaction(jsonb) to service_role;
grant execute on function public.record_expense(jsonb) to service_role;
grant execute on function public.record_biometric_check_in(jsonb) to service_role;
grant execute on function public.update_vehicle_location(jsonb) to service_role;
