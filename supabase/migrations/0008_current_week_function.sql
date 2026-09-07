-- NKY. METH. JHS IGF Tracker
-- 0008_current_week_function.sql
--
-- term_weeks.status is a stored snapshot computed once (at term creation or
-- whenever an admin recalculates it) — it goes stale as real time passes,
-- and since weeks only cover Monday-Friday, a weekend always falls in the
-- gap between two weeks, so `status = 'Active'` can match ZERO rows on a
-- Saturday/Sunday even right after seeding. Any code that depends on it
-- (the Dashboard's "This Week" total, "Week X of 14") should instead
-- compute the current week from today's date, with sane fallbacks for a
-- weekend or a date past the end of term.

create or replace function fn_current_week_id(p_term_id uuid)
returns uuid
language sql
stable
as $$
  select coalesce(
    (select id from term_weeks where term_id = p_term_id and current_date between start_date and end_date limit 1),
    (select id from term_weeks where term_id = p_term_id and start_date > current_date order by start_date limit 1),
    (select id from term_weeks where term_id = p_term_id and end_date < current_date order by end_date desc limit 1)
  );
$$;

grant execute on function fn_current_week_id(uuid) to authenticated;

create or replace function fn_dashboard_summary(p_term_id uuid)
returns table (
  total_collected numeric,
  today_collected numeric,
  week_collected numeric,
  term_collected numeric,
  pta_total numeric,
  morning_total numeric,
  sports_total numeric,
  worship_total numeric,
  uniform_total numeric,
  other_total numeric,
  outstanding_levies numeric,
  awaiting_handover numeric,
  reconciled_amount numeric,
  transaction_count bigint
)
language sql
stable
as $$
  with term_txns as (
    select t.*, ct.name as ct_name
    from transactions t
    join collection_types ct on ct.id = t.collection_type_id
    where t.term_id = p_term_id and t.status in ('Confirmed', 'Reconciled')
  )
  select
    coalesce((select sum(amount) from transactions where status in ('Confirmed', 'Reconciled')), 0),
    coalesce((select sum(amount) from term_txns where transaction_date = current_date), 0),
    coalesce((select sum(amount) from term_txns where week_id = fn_current_week_id(p_term_id)), 0),
    coalesce((select sum(amount) from term_txns), 0),
    coalesce((select sum(amount) from term_txns where ct_name = 'PTA Levy'), 0),
    coalesce((select sum(amount) from term_txns where ct_name = 'Morning Classes'), 0),
    coalesce((select sum(amount) from term_txns where ct_name = 'Sports Levy'), 0),
    coalesce((select sum(amount) from term_txns where ct_name = 'Friday Worship Offering'), 0),
    coalesce((select sum(amount) from term_txns where ct_name = 'School Uniform'), 0),
    coalesce((select sum(amount) from term_txns
      where ct_name not in ('PTA Levy', 'Morning Classes', 'Sports Levy', 'Friday Worship Offering', 'School Uniform')), 0),
    coalesce((select sum(balance) from student_obligations where term_id = p_term_id and balance > 0), 0),
    coalesce((select sum(calculated_collection_amount) from cash_handovers where status in ('Draft', 'Submitted')), 0),
    coalesce((select sum(received_amount) from cash_handovers where status = 'Reconciled'), 0),
    (select count(*) from term_txns);
$$;
