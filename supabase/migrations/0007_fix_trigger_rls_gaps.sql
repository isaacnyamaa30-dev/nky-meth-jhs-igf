-- NKY. METH. JHS IGF Tracker
-- 0007_fix_trigger_rls_gaps.sql
--
-- Three triggers write to a DIFFERENT table than the one the user's
-- statement targets, as a side effect of an ordinary insert:
--   transactions INSERT  -> receipts INSERT            (fn_create_receipt)
--   transactions INSERT  -> student_obligations UPSERT (fn_recompute_student_obligation)
--   uniform_sales INSERT -> uniform_items UPDATE        (fn_decrement_uniform_stock)
--
-- Because these functions run with the CALLING user's privileges (the
-- default), RLS on the side-effect table is evaluated against that user —
-- and a teacher (who can legitimately insert their own transaction or
-- uniform sale) has no write policy on receipts/student_obligations/
-- uniform_items. The whole statement then fails RLS and rolls back,
-- surfaced to the client as a bare 403. These are system-derived side
-- effects the user never edits directly, so — like the audit-log and
-- new-user triggers already are — they should run as SECURITY DEFINER.

create or replace function fn_create_receipt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into receipts (transaction_id, receipt_number, generated_by)
  values (new.id, new.receipt_number, new.created_by)
  on conflict (transaction_id) do nothing;
  return new;
end;
$$;

create or replace function fn_recompute_student_obligation(
  p_student_id uuid, p_collection_type_id uuid, p_term_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
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

create or replace function fn_decrement_uniform_stock()
returns trigger
language plpgsql
security definer
set search_path = public
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
