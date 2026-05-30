create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse')),
  "passwordHash" text not null,
  photo text,
  dept text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'student', 'parent', 'accountant', 'staff', 'driver', 'librarian', 'nurse')),
  active boolean not null default true,
  "assignedBy" uuid references public.users(id) on delete set null,
  "assignedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.school_settings (
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

create table if not exists public.students (
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

create table if not exists public.staff (
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

create table if not exists public.leave_requests (
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

create table if not exists public.books (
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

create table if not exists public.borrowings (
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

create table if not exists public.health_records (
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

create table if not exists public.marks (
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

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(14,2) not null default 0,
  quantity numeric(14,2) not null default 0,
  unit text not null default 'unit',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.transactions (
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

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null,
  date date not null default current_date,
  "paidBy" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  "className" text not null,
  term text not null,
  "academicYear" text not null,
  items jsonb not null default '[]'::jsonb,
  "totalAmount" numeric(14,2) not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.attendance_records (
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

create table if not exists public.vehicles (
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

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stops jsonb not null default '[]'::jsonb,
  "vehicleId" uuid references public.vehicles(id) on delete set null,
  "morningStartTime" text not null,
  "eveningStartTime" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.timetable_entries (
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

create table if not exists public.dormitories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer not null default 0,
  gender text not null default 'Mixed' check (gender in ('Male', 'Female', 'Mixed')),
  rooms jsonb not null default '[]'::jsonb,
  "wardenName" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.dorm_rooms (
  id uuid primary key default gen_random_uuid(),
  "dormId" uuid not null references public.dormitories(id) on delete cascade,
  "roomNumber" text not null,
  capacity integer not null default 1,
  occupants jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("dormId", "roomNumber")
);

create table if not exists public.dorm_allocations (
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

create table if not exists public.notifications (
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

create index if not exists students_class_idx on public.students (class);
create index if not exists users_role_idx on public.users (role);
create unique index if not exists user_roles_one_active_role_idx on public.user_roles ("userId") where active;
create index if not exists user_roles_user_idx on public.user_roles ("userId", active);
create index if not exists transactions_student_idx on public.transactions ("studentId");
create index if not exists attendance_student_date_idx on public.attendance_records ("studentId", date);
create index if not exists dorm_allocations_student_idx on public.dorm_allocations ("studentId");
create index if not exists notifications_target_idx on public.notifications ("userId", "targetRole", read);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at before update on public.user_roles for each row execute function public.set_updated_at();
drop trigger if exists school_settings_set_updated_at on public.school_settings;
create trigger school_settings_set_updated_at before update on public.school_settings for each row execute function public.set_updated_at();
drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at before update on public.students for each row execute function public.set_updated_at();
drop trigger if exists staff_set_updated_at on public.staff;
create trigger staff_set_updated_at before update on public.staff for each row execute function public.set_updated_at();
drop trigger if exists leave_requests_set_updated_at on public.leave_requests;
create trigger leave_requests_set_updated_at before update on public.leave_requests for each row execute function public.set_updated_at();
drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at before update on public.books for each row execute function public.set_updated_at();
drop trigger if exists borrowings_set_updated_at on public.borrowings;
create trigger borrowings_set_updated_at before update on public.borrowings for each row execute function public.set_updated_at();
drop trigger if exists health_records_set_updated_at on public.health_records;
create trigger health_records_set_updated_at before update on public.health_records for each row execute function public.set_updated_at();
drop trigger if exists marks_set_updated_at on public.marks;
create trigger marks_set_updated_at before update on public.marks for each row execute function public.set_updated_at();
drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at before update on public.inventory for each row execute function public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();
drop trigger if exists fee_structures_set_updated_at on public.fee_structures;
create trigger fee_structures_set_updated_at before update on public.fee_structures for each row execute function public.set_updated_at();
drop trigger if exists attendance_records_set_updated_at on public.attendance_records;
create trigger attendance_records_set_updated_at before update on public.attendance_records for each row execute function public.set_updated_at();
drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
drop trigger if exists routes_set_updated_at on public.routes;
create trigger routes_set_updated_at before update on public.routes for each row execute function public.set_updated_at();
drop trigger if exists timetable_entries_set_updated_at on public.timetable_entries;
create trigger timetable_entries_set_updated_at before update on public.timetable_entries for each row execute function public.set_updated_at();
drop trigger if exists dormitories_set_updated_at on public.dormitories;
create trigger dormitories_set_updated_at before update on public.dormitories for each row execute function public.set_updated_at();
drop trigger if exists dorm_rooms_set_updated_at on public.dorm_rooms;
create trigger dorm_rooms_set_updated_at before update on public.dorm_rooms for each row execute function public.set_updated_at();
drop trigger if exists dorm_allocations_set_updated_at on public.dorm_allocations;
create trigger dorm_allocations_set_updated_at before update on public.dorm_allocations for each row execute function public.set_updated_at();
drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at before update on public.notifications for each row execute function public.set_updated_at();

create or replace function public.record_transaction(transaction_input jsonb)
returns jsonb
language plpgsql
as $$
declare
  inserted public.transactions%rowtype;
  tx_amount numeric(14,2) := coalesce(nullif(transaction_input->>'amount', '')::numeric, 0);
  tx_student_id uuid := nullif(transaction_input->>'studentId', '')::uuid;
begin
  insert into public.transactions (type, category, amount, date, status, "studentId", reference, description, currency)
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
as $$
declare
  inserted public.expenses%rowtype;
begin
  insert into public.expenses (description, amount, category, date, "paidBy")
  values (
    coalesce(expense_input->>'description', 'Expense'),
    coalesce(nullif(expense_input->>'amount', '')::numeric, 0),
    coalesce(expense_input->>'category', 'General'),
    coalesce(nullif(expense_input->>'date', '')::date, current_date),
    coalesce(expense_input->>'paidBy', 'System')
  )
  returning * into inserted;

  insert into public.transactions (type, category, amount, date, status, reference, description)
  values ('expense', inserted.category, inserted.amount, inserted.date, 'completed', 'EXP-' || right(inserted.id::text, 8), inserted.description);

  return to_jsonb(inserted);
end;
$$;

create or replace function public.record_biometric_check_in(check_in jsonb)
returns jsonb
language plpgsql
as $$
declare
  matched_student public.students%rowtype;
  inserted public.attendance_records%rowtype;
begin
  select * into matched_student from public.students where "fingerprintId" = check_in->>'fingerprintId' limit 1;
  if matched_student.id is null then
    raise exception 'No student matched this fingerprint';
  end if;

  insert into public.attendance_records ("studentId", "studentName", date, status, role, "biometricVerified", "deviceId")
  values (
    matched_student.id::text,
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
