-- NKY. METH. JHS IGF Tracker
-- 0004_reporting_functions.sql
--
-- All aggregates read from the `transactions` table (never a separately
-- maintained total), and are declared without SECURITY DEFINER, so they run
-- with the calling user's own privileges: existing RLS policies on
-- transactions / cash_handovers / student_obligations apply exactly as they
-- would to a direct query. A teacher calling these sees only their own
-- collections; admin/headteacher/accounts see the whole school.

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
  ), current_week as (
    select id from term_weeks where term_id = p_term_id and status = 'Active' limit 1
  )
  select
    coalesce((select sum(amount) from transactions where status in ('Confirmed', 'Reconciled')), 0),
    coalesce((select sum(amount) from term_txns where transaction_date = current_date), 0),
    coalesce((select sum(amount) from term_txns where week_id = (select id from current_week)), 0),
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

create or replace function fn_weekly_trend(p_term_id uuid)
returns table (week_number integer, total numeric)
language sql
stable
as $$
  select tw.week_number, coalesce(sum(t.amount), 0)
  from term_weeks tw
  left join transactions t on t.week_id = tw.id and t.status in ('Confirmed', 'Reconciled')
  where tw.term_id = p_term_id
  group by tw.week_number
  order by tw.week_number;
$$;

create or replace function fn_category_breakdown(p_term_id uuid)
returns table (category text, total numeric)
language sql
stable
as $$
  select ct.name, coalesce(sum(t.amount), 0)
  from collection_types ct
  left join transactions t
    on t.collection_type_id = ct.id and t.term_id = p_term_id and t.status in ('Confirmed', 'Reconciled')
  group by ct.name
  order by 2 desc;
$$;

create or replace function fn_payment_status_breakdown(p_term_id uuid)
returns table (status text, total_balance numeric, obligation_count bigint)
language sql
stable
as $$
  select
    case status when 'Not Paid' then 'Outstanding' when 'Partially Paid' then 'Partial' else status end,
    sum(greatest(balance, 0)),
    count(*)
  from student_obligations
  where term_id = p_term_id
  group by 1;
$$;

-- 14-week term report (section 32): one row per week, one column per
-- default collection category, "Other" buckets every non-default type.
create or replace function fn_term_report(p_term_id uuid)
returns table (
  week_number integer,
  pta numeric, morning numeric, sports numeric, worship numeric, uniform numeric, other numeric, total numeric
)
language sql
stable
as $$
  select
    tw.week_number,
    coalesce(sum(t.amount) filter (where ct.name = 'PTA Levy'), 0),
    coalesce(sum(t.amount) filter (where ct.name = 'Morning Classes'), 0),
    coalesce(sum(t.amount) filter (where ct.name = 'Sports Levy'), 0),
    coalesce(sum(t.amount) filter (where ct.name = 'Friday Worship Offering'), 0),
    coalesce(sum(t.amount) filter (where ct.name = 'School Uniform'), 0),
    coalesce(sum(t.amount) filter (
      where ct.name not in ('PTA Levy', 'Morning Classes', 'Sports Levy', 'Friday Worship Offering', 'School Uniform')
    ), 0),
    coalesce(sum(t.amount), 0)
  from term_weeks tw
  left join transactions t on t.week_id = tw.id and t.status in ('Confirmed', 'Reconciled')
  left join collection_types ct on ct.id = t.collection_type_id
  where tw.term_id = p_term_id
  group by tw.week_number
  order by tw.week_number;
$$;

-- Staff collection report (section 35).
create or replace function fn_staff_collection_report(p_term_id uuid)
returns table (
  staff_id uuid,
  staff_name text,
  transaction_count bigint,
  total_collected numeric,
  handed_over numeric,
  outstanding_handover numeric
)
language sql
stable
as $$
  with collected as (
    select staff_id, count(*) as cnt, sum(amount) as total
    from transactions
    where term_id = p_term_id and status in ('Confirmed', 'Reconciled')
    group by staff_id
  ), handed as (
    select teacher_id, sum(coalesce(received_amount, declared_amount, 0)) as handed_total
    from cash_handovers
    where status in ('Received', 'Reconciled')
    group by teacher_id
  )
  select
    s.id, s.full_name,
    coalesce(c.cnt, 0), coalesce(c.total, 0), coalesce(h.handed_total, 0),
    coalesce(c.total, 0) - coalesce(h.handed_total, 0)
  from staff s
  join collected c on c.staff_id = s.id
  left join handed h on h.teacher_id = s.id
  order by coalesce(c.total, 0) desc;
$$;

grant execute on function fn_dashboard_summary(uuid) to authenticated;
grant execute on function fn_weekly_trend(uuid) to authenticated;
grant execute on function fn_category_breakdown(uuid) to authenticated;
grant execute on function fn_payment_status_breakdown(uuid) to authenticated;
grant execute on function fn_term_report(uuid) to authenticated;
grant execute on function fn_staff_collection_report(uuid) to authenticated;
