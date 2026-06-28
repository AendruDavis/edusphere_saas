alter table public.school_settings
  add column if not exists "notificationSettings" jsonb not null default '{}'::jsonb;

alter table public.fee_structures
  add column if not exists "dueDate" date;

create or replace function public.enforce_school_membership_limit()
returns trigger
language plpgsql
as $$
begin
  if new.active and new.role <> 'admin' and exists (
    select 1 from public.school_memberships sm
    where sm."userId" = new."userId"
      and sm.active
      and sm.id <> new.id
  ) then
    raise exception 'Only administrators may belong to multiple schools';
  end if;
  return new;
end;
$$;

drop trigger if exists school_membership_limit on public.school_memberships;
create trigger school_membership_limit
before insert or update on public.school_memberships
for each row execute function public.enforce_school_membership_limit();

create or replace function public.record_transaction(transaction_input jsonb)
returns jsonb
language plpgsql
as $$
declare
  inserted public.transactions%rowtype;
  tx_school_id uuid := nullif(transaction_input->>'schoolId', '')::uuid;
  tx_amount numeric(14,2) := coalesce(nullif(transaction_input->>'amount', '')::numeric, 0);
  tx_student_id uuid := nullif(transaction_input->>'studentId', '')::uuid;
begin
  if tx_school_id is null then raise exception 'schoolId is required'; end if;
  insert into public.transactions ("schoolId", type, category, amount, date, status, "studentId", reference, description, currency)
  values (
    tx_school_id,
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
    set "totalFeesPaid" = coalesce("totalFeesPaid", 0) + tx_amount,
        "feesBalance" = greatest(0, coalesce("feesBalance", 0) - tx_amount)
    where id = inserted."studentId" and "schoolId" = tx_school_id;
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
  expense_school_id uuid := nullif(expense_input->>'schoolId', '')::uuid;
begin
  if expense_school_id is null then raise exception 'schoolId is required'; end if;
  insert into public.expenses ("schoolId", description, amount, category, date, "paidBy")
  values (
    expense_school_id,
    coalesce(expense_input->>'description', 'Expense'),
    coalesce(nullif(expense_input->>'amount', '')::numeric, 0),
    coalesce(expense_input->>'category', 'General'),
    coalesce(nullif(expense_input->>'date', '')::date, current_date),
    coalesce(expense_input->>'paidBy', 'System')
  )
  returning * into inserted;

  insert into public.transactions ("schoolId", type, category, amount, date, status, reference, description)
  values (
    expense_school_id, 'expense', inserted.category, inserted.amount, inserted.date,
    'completed', 'EXP-' || right(inserted.id::text, 8), inserted.description
  );
  return to_jsonb(inserted);
end;
$$;

create or replace function public.update_vehicle_location(location_input jsonb)
returns jsonb
language plpgsql
as $$
declare
  updated public.vehicles%rowtype;
  location_school_id uuid := nullif(location_input->>'schoolId', '')::uuid;
begin
  update public.vehicles
  set "lastLocation" = jsonb_build_object(
    'lat', (location_input->>'lat')::numeric,
    'lng', (location_input->>'lng')::numeric,
    'lastUpdate', coalesce(location_input->>'lastUpdate', now()::text)
  )
  where id = (location_input->>'vehicleId')::uuid
    and "schoolId" = location_school_id
  returning * into updated;
  if updated.id is null then raise exception 'Vehicle not found'; end if;
  return to_jsonb(updated);
end;
$$;
