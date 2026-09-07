-- NKY. METH. JHS IGF Tracker
-- 0002_functions_triggers.sql
-- Business logic: numbering, term/week generation, obligation balances,
-- stock decrement, cash handover discrepancy detection, audit logging.

-- ----------------------------------------------------------------------------
-- Generic updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','academic_years','classes','staff','students','terms',
    'collection_types','student_obligations','transactions','uniform_items'
  ]
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I for each row execute function fn_set_updated_at();',
      t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- New auth user -> profile row
-- ----------------------------------------------------------------------------
create or replace function fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Unnamed User'),
    coalesce(new.raw_user_meta_data ->> 'role', 'teacher')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_handle_new_user
after insert on auth.users
for each row execute function fn_handle_new_user();

-- ----------------------------------------------------------------------------
-- Term creation -> generate 14-week calendar (Mon-Fri school days)
-- Assumes term.start_date falls on a Monday.
-- ----------------------------------------------------------------------------
create or replace function fn_generate_term_calendar()
returns trigger
language plpgsql
as $$
declare
  w integer;
  week_start date;
  week_end date;
  d date;
begin
  for w in 1 .. new.number_of_weeks loop
    week_start := new.start_date + ((w - 1) * 7);
    week_end := week_start + 4;

    insert into term_weeks (term_id, week_number, start_date, end_date, status)
    values (new.id, w, week_start, week_end, 'Upcoming');

    d := week_start;
    while d <= week_end loop
      insert into school_calendar (term_id, calendar_date, day_type)
      values (new.id, d, 'School Day')
      on conflict (term_id, calendar_date) do nothing;
      d := d + 1;
    end loop;
  end loop;
  return new;
end;
$$;

create trigger trg_generate_term_calendar
after insert on terms
for each row execute function fn_generate_term_calendar();

-- ----------------------------------------------------------------------------
-- Transaction / receipt numbering
-- Format: NKY-T{n}-{year}-{seq6}   and   NKY-{year}-T{n}-R{seq6}
-- ----------------------------------------------------------------------------
create sequence if not exists transaction_number_seq;
create sequence if not exists receipt_number_seq;

create or replace function fn_set_transaction_defaults()
returns trigger
language plpgsql
as $$
declare
  v_term record;
  v_week_id uuid;
  v_term_ordinal text;
  v_year text;
begin
  -- Derive term/week/academic year from the transaction date when not supplied.
  if new.term_id is null then
    select id, academic_year_id, term_name into v_term
    from terms
    where new.transaction_date between start_date and end_date
    order by status = 'Active' desc
    limit 1;

    if v_term.id is null then
      raise exception 'No term covers date %. Set term_id explicitly or create the matching term.', new.transaction_date;
    end if;

    new.term_id := v_term.id;
    new.academic_year_id := coalesce(new.academic_year_id, v_term.academic_year_id);
  end if;

  if new.week_id is null then
    select id into v_week_id
    from term_weeks
    where term_id = new.term_id
      and new.transaction_date between start_date and end_date
    limit 1;
    new.week_id := v_week_id;
  end if;

  if new.transaction_number is null then
    select term_name into v_term_ordinal from terms where id = new.term_id;
    v_term_ordinal := 'T' || regexp_replace(coalesce(v_term_ordinal, 'Term 0'), '\D', '', 'g');
    v_year := to_char(new.transaction_date, 'YYYY');
    new.transaction_number := 'NKY-' || v_term_ordinal || '-' || v_year || '-' ||
      lpad(nextval('transaction_number_seq')::text, 6, '0');
  end if;

  if new.receipt_number is null then
    select term_name into v_term_ordinal from terms where id = new.term_id;
    v_term_ordinal := 'T' || regexp_replace(coalesce(v_term_ordinal, 'Term 0'), '\D', '', 'g');
    v_year := to_char(new.transaction_date, 'YYYY');
    new.receipt_number := 'NKY-' || v_year || '-' || v_term_ordinal || '-R' ||
      lpad(nextval('receipt_number_seq')::text, 6, '0');
  end if;

  new.created_by := coalesce(new.created_by, auth.uid());

  return new;
end;
$$;

create trigger trg_set_transaction_defaults
before insert on transactions
for each row execute function fn_set_transaction_defaults();

-- After a transaction is inserted, create its receipt record.
create or replace function fn_create_receipt()
returns trigger
language plpgsql
as $$
begin
  insert into receipts (transaction_id, receipt_number, generated_by)
  values (new.id, new.receipt_number, new.created_by)
  on conflict (transaction_id) do nothing;
  return new;
end;
$$;

create trigger trg_create_receipt
after insert on transactions
for each row execute function fn_create_receipt();

-- Voiding: require voided_at/voided_by to be stamped automatically.
create or replace function fn_stamp_void()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Voided' and old.status <> 'Voided' then
    new.voided_at := now();
    new.voided_by := coalesce(new.voided_by, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_stamp_void
before update on transactions
for each row execute function fn_stamp_void();

-- ----------------------------------------------------------------------------
-- Keep student_obligations.amount_paid in sync with confirmed transactions
-- ----------------------------------------------------------------------------
create or replace function fn_recompute_student_obligation(
  p_student_id uuid, p_collection_type_id uuid, p_term_id uuid
)
returns void
language plpgsql
as $$
declare
  v_total numeric(12, 2);
  v_academic_year_id uuid;
  v_default_amount numeric(12, 2);
  v_obligation student_obligations%rowtype;
begin
  select coalesce(sum(amount), 0) into v_total
  from transactions
  where student_id = p_student_id
    and collection_type_id = p_collection_type_id
    and term_id = p_term_id
    and status in ('Confirmed', 'Reconciled');

  select academic_year_id into v_academic_year_id from terms where id = p_term_id;
  select default_amount into v_default_amount from collection_types where id = p_collection_type_id;

  insert into student_obligations (student_id, collection_type_id, academic_year_id, term_id, expected_amount, amount_paid)
  values (p_student_id, p_collection_type_id, v_academic_year_id, p_term_id, coalesce(v_default_amount, 0), v_total)
  on conflict (student_id, collection_type_id, term_id)
  do update set amount_paid = v_total
  returning * into v_obligation;

  update student_obligations
  set status = case
    when v_obligation.waived_amount > 0 and v_obligation.amount_paid = 0
      and (v_obligation.expected_amount - v_obligation.amount_paid - v_obligation.waived_amount) <= 0 then 'Waived'
    when (v_obligation.expected_amount - v_obligation.amount_paid - v_obligation.waived_amount) <= 0 then 'Paid'
    when v_obligation.amount_paid > 0 then 'Partially Paid'
    else 'Not Paid'
  end
  where id = v_obligation.id;
end;
$$;

create or replace function fn_transactions_after_change()
returns trigger
language plpgsql
as $$
declare
  v_student_specific boolean;
  v_row record;
begin
  -- NEW is unassigned on DELETE and OLD is unassigned on INSERT, so either
  -- one referenced directly (e.g. via coalesce(new, old)) raises "record is
  -- not assigned yet" for the event where it doesn't apply.
  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  if v_row.student_id is not null then
    select student_specific into v_student_specific
    from collection_types where id = v_row.collection_type_id;

    if v_student_specific then
      perform fn_recompute_student_obligation(v_row.student_id, v_row.collection_type_id, v_row.term_id);
    end if;
  end if;

  return v_row;
end;
$$;

create trigger trg_transactions_after_change
after insert or update of amount, status or delete on transactions
for each row execute function fn_transactions_after_change();

-- ----------------------------------------------------------------------------
-- Uniform stock decrement (atomic, race-safe, blocks negative stock unless
-- system_settings.inventory.allow_negative_stock = true)
-- ----------------------------------------------------------------------------
create or replace function fn_decrement_uniform_stock()
returns trigger
language plpgsql
as $$
declare
  v_allow_negative boolean;
begin
  select coalesce((value ->> 'allow_negative_stock')::boolean, false)
  into v_allow_negative
  from system_settings where key = 'inventory';

  update uniform_items
  set current_stock = current_stock - new.quantity
  where id = new.item_id
    and (v_allow_negative or current_stock >= new.quantity);

  if not found then
    raise exception 'Insufficient stock for this uniform item.';
  end if;

  return new;
end;
$$;

create trigger trg_decrement_uniform_stock
after insert on uniform_sales
for each row execute function fn_decrement_uniform_stock();

-- ----------------------------------------------------------------------------
-- Cash handover: auto-detect discrepancy when accounts officer records the
-- amount actually received.
-- ----------------------------------------------------------------------------
create or replace function fn_evaluate_cash_handover()
returns trigger
language plpgsql
as $$
begin
  if new.received_amount is not null and (old.received_amount is distinct from new.received_amount) then
    new.received_at := coalesce(new.received_at, now());
    if (new.received_amount - new.calculated_collection_amount) <> 0 then
      new.status := 'Discrepancy';
    else
      new.status := 'Received';
    end if;
  end if;

  if new.status = 'Submitted' and old.status = 'Draft' then
    new.submitted_at := coalesce(new.submitted_at, now());
  end if;

  return new;
end;
$$;

create trigger trg_evaluate_cash_handover
before update on cash_handovers
for each row execute function fn_evaluate_cash_handover();

-- ----------------------------------------------------------------------------
-- Generic audit logging
-- ----------------------------------------------------------------------------
create or replace function fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_action text;
  v_reason text;
begin
  if tg_op = 'INSERT' then
    insert into audit_logs (user_id, action, entity_type, entity_id, new_values)
    values (v_user, 'Create', tg_table_name, (new.id)::text, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    v_action := 'Update';
    v_reason := null;

    -- `status`/`void_reason` only exist on the transactions table; this
    -- trigger is shared across several tables (classes, collection_types,
    -- uniform_items, ... have no `status` column), so the check must be
    -- its own statement reached only for transactions, not folded into one
    -- boolean expression evaluated against every table's row type.
    if tg_table_name = 'transactions' then
      if new.status = 'Voided' and old.status <> 'Voided' then
        v_action := 'Void';
        v_reason := new.void_reason;
      end if;
    end if;

    insert into audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, reason)
    values (v_user, v_action, tg_table_name, (new.id)::text, to_jsonb(old), to_jsonb(new), v_reason);
    return new;
  elsif tg_op = 'DELETE' then
    insert into audit_logs (user_id, action, entity_type, entity_id, old_values)
    values (v_user, 'Delete', tg_table_name, (old.id)::text, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'staff','students','classes','collection_types','transactions',
    'cash_handovers','uniform_items','academic_years','terms'
  ]
  loop
    execute format(
      'create trigger trg_audit_log after insert or update or delete on %I for each row execute function fn_audit_log();',
      t
    );
  end loop;
end $$;
