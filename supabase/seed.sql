-- NKY. METH. JHS IGF Tracker
-- seed.sql — SAMPLE / TEST DATA ONLY.
--
-- All names, phone numbers and figures below are fictional. This dataset
-- exists so every dashboard, report and workflow in the application can be
-- exercised end-to-end before real school data is entered. An administrator
-- should clear it out (see the note at the bottom) before production use.
--
-- Run with the Supabase CLI (`supabase db reset`, which applies migrations
-- then this file), or paste into the SQL editor while connected as the
-- `postgres` role so Row Level Security is bypassed.
--
-- Safe to re-run: everything this script creates is cleared out first, so
-- running it again after a failed attempt (or just to reset the sample
-- data) never hits a duplicate-key error. It never touches `profiles` or
-- `auth.users` — real login accounts you've created are left alone.

truncate table
  audit_logs, reconciliation_records, cash_handovers, uniform_sales, receipts,
  transactions, student_obligations, students, school_calendar, term_weeks,
  terms, classes, staff, collection_types, uniform_items, academic_years
cascade;

delete from system_settings where key in ('school_profile', 'active_context', 'inventory');

alter sequence transaction_number_seq restart with 1;
alter sequence receipt_number_seq restart with 1;

-- ============================================================================
-- Academic year & Term 1 (14 weeks, starting the Monday of the current week
-- so "today" always lands inside an Active week when this is (re)seeded).
-- ============================================================================
insert into academic_years (name, start_date, end_date, status)
values (
  '2026/2027',
  date_trunc('week', current_date)::date - 7,
  date_trunc('week', current_date)::date + 300,
  'Active'
);

insert into terms (academic_year_id, term_name, start_date, end_date, number_of_weeks, status)
select id, 'Term 1', date_trunc('week', current_date)::date, date_trunc('week', current_date)::date + 97, 14, 'Active'
from academic_years where name = '2026/2027';
-- The AFTER INSERT trigger on terms auto-generates 14 term_weeks and their
-- Monday-Friday school_calendar rows.

update term_weeks
set status = case
  when current_date between start_date and end_date then 'Active'
  when current_date > end_date then 'Completed'
  else 'Upcoming'
end
where term_id = (select id from terms where term_name = 'Term 1' limit 1);

-- ============================================================================
-- Classes
-- ============================================================================
insert into classes (class_name, academic_year_id, active)
select name, (select id from academic_years where name = '2026/2027'), true
from unnest(array['JHS 1A', 'JHS 1B', 'JHS 2A', 'JHS 2B', 'JHS 3A', 'JHS 3B']) as name;

-- ============================================================================
-- Staff (18 seed members): 1 admin, 1 headteacher, 1 accounts officer,
-- 6 class teachers, 9 subject teachers.
-- ============================================================================
insert into staff (staff_number, full_name, gender, phone_number, email, job_title, user_role, status, date_joined)
select
  'STF-' || lpad(n::text, 4, '0'),
  nm.full_name,
  case when n % 2 = 0 then 'Male' else 'Female' end,
  '05' || lpad((20000000 + n * 219)::text, 8, '0'),
  lower(replace(nm.full_name, ' ', '.')) || n || '@nkymethjhs.edu.gh',
  case
    when n = 1 then 'System Administrator'
    when n = 2 then 'Headteacher'
    when n = 3 then 'Accounts / IGF Officer'
    when n between 4 and 9 then 'Class Teacher'
    else 'Subject Teacher'
  end,
  case
    when n = 1 then 'admin'
    when n = 2 then 'headteacher'
    when n = 3 then 'accounts'
    else 'teacher'
  end,
  'Active',
  current_date - ((18 - n) * 45)
from generate_series(1, 18) as n
join lateral (
  select (array[
    'Samuel Owusu', 'Grace Mensah', 'Daniel Boateng', 'Comfort Asante', 'Emmanuel Agyei', 'Beatrice Appiah',
    'Isaac Osei', 'Gifty Darko', 'Michael Amankwah', 'Christiana Frimpong', 'Joseph Adjei', 'Vida Nkrumah',
    'Francis Yeboah', 'Doris Sarpong', 'Eric Antwi', 'Patience Boakye', 'George Amoah', 'Millicent Danso'
  ])[n] as full_name
) nm on true;

-- Assign 6 of the teachers as class teachers, one per class.
update classes c
set class_teacher_id = s.id
from (
  select id, row_number() over (order by staff_number) as rn
  from staff where staff_number in ('STF-0004', 'STF-0005', 'STF-0006', 'STF-0007', 'STF-0008', 'STF-0009')
) s
where c.class_name = (array['JHS 1A', 'JHS 1B', 'JHS 2A', 'JHS 2B', 'JHS 3A', 'JHS 3B'])[s.rn];

update staff st
set assigned_class_id = c.id
from classes c
where c.class_teacher_id = st.id;

-- ============================================================================
-- Collection types
-- ============================================================================
insert into collection_types (name, description, frequency, calculation_method, default_amount, student_specific, class_specific, active)
values
  ('PTA Levy', 'Termly Parent-Teacher Association levy', 'Termly', 'Fixed per student', 50.00, true, false, true),
  ('Morning Classes', 'Extra morning class / remedial fee', 'Daily', 'Fixed per student', 2.00, true, false, true),
  ('Sports Levy', 'Termly sports and athletics levy', 'Termly', 'Fixed per student', 15.00, true, false, true),
  ('Friday Worship Offering', 'Weekly Friday worship offering', 'Weekly', 'General collection', null, false, false, true),
  ('School Uniform', 'Uniform item sales', 'Intermittent', 'Quantity x unit price', null, true, false, true),
  ('Other', 'Miscellaneous intermittent school collections', 'Intermittent', 'Variable amount', null, false, false, true);

-- ============================================================================
-- Uniform inventory
-- ============================================================================
insert into uniform_items (item_name, gender_category, size, unit_price, opening_stock, current_stock, reorder_level, active)
values
  ('School Shirt', 'Boys', 'Small', 25.00, 40, 40, 10, true),
  ('School Shirt', 'Boys', 'Medium', 25.00, 40, 40, 10, true),
  ('School Dress', 'Girls', 'Small', 30.00, 40, 40, 10, true),
  ('School Dress', 'Girls', 'Medium', 30.00, 40, 40, 10, true),
  ('School Lacoste', 'Unisex', 'Medium', 35.00, 30, 30, 8, true),
  ('PE Kit', 'Unisex', 'Medium', 40.00, 25, 25, 6, true);

-- ============================================================================
-- Students: 60 total, 10 per class.
-- ============================================================================
insert into students (student_number, full_name, gender, class_id, parent_guardian_name, parent_guardian_phone, admission_status, academic_year_id)
select
  'STU-' || lpad(n::text, 4, '0'),
  fn.first_name || ' ' || ln.last_name,
  case when n % 2 = 0 then 'Male' else 'Female' end,
  cls.id,
  'Parent/Guardian of ' || fn.first_name || ' ' || ln.last_name,
  '02' || lpad((30000000 + n * 137)::text, 8, '0'),
  'Active',
  (select id from academic_years where name = '2026/2027')
from generate_series(1, 60) as n
join lateral (
  select id, row_number() over (order by class_name) as rn from classes
) cls on cls.rn = ((n - 1) / 10) + 1
join lateral (
  select (array[
    'Kwame', 'Ama', 'Kofi', 'Akosua', 'Yaw', 'Efua', 'Kwabena', 'Adjoa', 'Kwaku', 'Abena',
    'Kojo', 'Afia', 'Fiifi', 'Araba', 'Kwesi'
  ])[1 + ((n * 3) % 15)] as first_name
) fn on true
join lateral (
  select (array[
    'Mensah', 'Owusu', 'Boateng', 'Asante', 'Agyei', 'Appiah', 'Osei', 'Darko', 'Amankwah',
    'Frimpong', 'Adjei', 'Nkrumah', 'Yeboah', 'Sarpong', 'Antwi'
  ])[1 + ((n * 5) % 15)] as last_name
) ln on true;

-- ============================================================================
-- Student obligations: pre-create the termly PTA and Sports levy obligation
-- for every student so Outstanding Payments has full coverage even before
-- any transaction is recorded.
-- ============================================================================
insert into student_obligations (student_id, collection_type_id, academic_year_id, term_id, expected_amount)
select s.id, ct.id, s.academic_year_id, (select id from terms where term_name = 'Term 1' limit 1), ct.default_amount
from students s
cross join collection_types ct
where ct.name in ('PTA Levy', 'Sports Levy');

-- ============================================================================
-- Transactions — PTA Levy (matches the partial-payment example in the spec:
-- GH20 + GH20 + GH10 = GH50). Distribution across the 60 students by
-- row_number() mod 5 so every payment status is represented.
-- ============================================================================
with term1 as (
  select start_date from terms where term_name = 'Term 1' limit 1
), ranked_students as (
  select id, class_id, row_number() over (order by student_number) as ord from students
), acct as (
  select id from staff where staff_number = 'STF-0003'
)
insert into transactions (transaction_date, collection_type_id, student_id, class_id, staff_id, amount, payment_method, status)
select (select start_date from term1) + 3, (select id from collection_types where name = 'PTA Levy'), rs.id, rs.class_id, (select id from acct), 50.00, 'Cash', 'Confirmed'
from ranked_students rs where rs.ord % 5 = 1
union all
select (select start_date from term1) + 3, (select id from collection_types where name = 'PTA Levy'), rs.id, rs.class_id, (select id from acct), 20.00, 'Cash', 'Confirmed'
from ranked_students rs where rs.ord % 5 = 2
union all
select (select start_date from term1) + 17, (select id from collection_types where name = 'PTA Levy'), rs.id, rs.class_id, (select id from acct), 20.00, 'Mobile Money', 'Confirmed'
from ranked_students rs where rs.ord % 5 = 2
union all
select (select start_date from term1) + 3, (select id from collection_types where name = 'PTA Levy'), rs.id, rs.class_id, (select id from acct), 20.00, 'Cash', 'Confirmed'
from ranked_students rs where rs.ord % 5 = 3
union all
select (select start_date from term1) + 17, (select id from collection_types where name = 'PTA Levy'), rs.id, rs.class_id, (select id from acct), 20.00, 'Cash', 'Confirmed'
from ranked_students rs where rs.ord % 5 = 3
union all
select (select start_date from term1) + 31, (select id from collection_types where name = 'PTA Levy'), rs.id, rs.class_id, (select id from acct), 10.00, 'Mobile Money', 'Confirmed'
from ranked_students rs where rs.ord % 5 = 3
union all
select (select start_date from term1) + 3, (select id from collection_types where name = 'PTA Levy'), rs.id, rs.class_id, (select id from acct), 25.00, 'Cash', 'Confirmed'
from ranked_students rs where rs.ord % 5 = 4;
-- ord % 5 = 0 (12 students) intentionally left unpaid -> shows as outstanding.

-- ============================================================================
-- Transactions — Sports Levy
-- ============================================================================
with term1 as (
  select start_date from terms where term_name = 'Term 1' limit 1
), ranked_students as (
  select id, class_id, row_number() over (order by student_number) as ord from students
), acct as (
  select id from staff where staff_number = 'STF-0003'
)
insert into transactions (transaction_date, collection_type_id, student_id, class_id, staff_id, amount, payment_method, status)
select (select start_date from term1) + 3, (select id from collection_types where name = 'Sports Levy'), rs.id, rs.class_id, (select id from acct), 15.00, 'Cash', 'Confirmed'
from ranked_students rs where rs.ord % 3 = 0
union all
select (select start_date from term1) + 3, (select id from collection_types where name = 'Sports Levy'), rs.id, rs.class_id, (select id from acct), 10.00, 'Cash', 'Confirmed'
from ranked_students rs where rs.ord % 3 = 1;
-- ord % 3 = 2 left unpaid -> outstanding.

-- ============================================================================
-- Transactions — Morning Classes (batch daily collection, weeks 1-4)
-- ============================================================================
with term1 as (
  select start_date from terms where term_name = 'Term 1' limit 1
), ranked_students as (
  select id, class_id, row_number() over (order by student_number) as ord from students
)
insert into transactions (transaction_date, collection_type_id, student_id, class_id, staff_id, amount, payment_method, status)
select
  (select start_date from term1) + (wk - 1) * 7,
  (select id from collection_types where name = 'Morning Classes'),
  rs.id,
  rs.class_id,
  coalesce((select class_teacher_id from classes where id = rs.class_id), (select id from staff where staff_number = 'STF-0003')),
  2.00,
  'Cash',
  'Confirmed'
from ranked_students rs
cross join generate_series(1, 4) as wk
where (rs.ord + wk) % 3 <> 0;

-- ============================================================================
-- Transactions — Friday Worship Offering (14-week general collection)
-- ============================================================================
with term1 as (
  select start_date from terms where term_name = 'Term 1' limit 1
)
insert into transactions (transaction_date, collection_type_id, staff_id, amount, payment_method, notes, status)
select
  (select start_date from term1) + ((wk - 1) * 7 + 4),
  (select id from collection_types where name = 'Friday Worship Offering'),
  (select id from staff where staff_number = 'STF-0003'),
  (150 + (wk * 17) % 120)::numeric(12, 2),
  'Cash',
  'Friday worship offering - Week ' || wk,
  'Confirmed'
from generate_series(1, 14) as wk;

-- ============================================================================
-- Transactions — Other intermittent collections
-- ============================================================================
with term1 as (
  select start_date from terms where term_name = 'Term 1' limit 1
)
insert into transactions (transaction_date, collection_type_id, staff_id, amount, payment_method, notes, status)
select
  (select start_date from term1) + (((n - 1) / 5) * 7 + ((n - 1) % 5)),
  (select id from collection_types where name = 'Other'),
  (select id from staff where staff_number = 'STF-0002'),
  (20 + (n * 23) % 80)::numeric(12, 2),
  (array['Cash', 'Mobile Money', 'Bank Transfer'])[1 + (n % 3)],
  (array[
    'Sports day gate fee', 'Old newspaper sales', 'Photocopy fee', 'Book donation refund', 'Canteen rent',
    'ID card replacement fee', 'Certificate printing fee', 'Inter-school quiz contribution', 'School van hire refund', 'Lost property sale'
  ])[n],
  'Confirmed'
from generate_series(1, 10) as n;

-- ============================================================================
-- Uniform sales (creates a transaction row + linked uniform_sales row per
-- sale, and exercises the automatic stock-decrement trigger).
-- ============================================================================
do $$
declare
  rec record;
  v_txn_id uuid;
  v_term1_start date;
  v_uniform_ct_id uuid;
  v_seller_id uuid;
begin
  select start_date into v_term1_start from terms where term_name = 'Term 1' limit 1;
  select id into v_uniform_ct_id from collection_types where name = 'School Uniform';
  select id into v_seller_id from staff where staff_number = 'STF-0003';

  for rec in
    select
      n,
      rs.id as student_id,
      ri.id as item_id,
      ri.unit_price,
      (1 + (n % 2)) as qty,
      (((n - 1) / 5) * 7 + ((n - 1) % 5)) as day_offset
    from generate_series(1, 15) as n
    join (select id, row_number() over (order by student_number) as ord from students) rs
      on rs.ord = 1 + ((n * 7) % 60)
    join (select id, unit_price, row_number() over (order by item_name, size) as ord from uniform_items) ri
      on ri.ord = 1 + (n % 6)
  loop
    insert into transactions (
      transaction_date, collection_type_id, student_id, staff_id,
      quantity, unit_amount, amount, payment_method, status
    )
    values (
      v_term1_start + rec.day_offset, v_uniform_ct_id, rec.student_id, v_seller_id,
      rec.qty, rec.unit_price, rec.unit_price * rec.qty, 'Cash', 'Confirmed'
    )
    returning id into v_txn_id;

    insert into uniform_sales (
      student_id, item_id, quantity, unit_price, payment_status,
      payment_method, sold_by, transaction_id, sale_date
    )
    values (
      rec.student_id, rec.item_id, rec.qty, rec.unit_price, 'Paid',
      'Cash', v_seller_id, v_txn_id, v_term1_start + rec.day_offset
    );
  end loop;
end $$;

-- ============================================================================
-- Cash handovers (one per class teacher) demonstrating every status,
-- including a resolved and an unresolved discrepancy.
-- ============================================================================
do $$
declare
  rec record;
  v_handover_id uuid;
  v_term1_start date;
  v_accounts_id uuid;
begin
  select start_date into v_term1_start from terms where term_name = 'Term 1' limit 1;
  select id into v_accounts_id from staff where staff_number = 'STF-0003';

  for rec in
    select
      t.id as teacher_id,
      row_number() over (order by t.staff_number) as rn,
      coalesce((
        select sum(amount) from transactions tx
        where tx.staff_id = t.id and tx.status = 'Confirmed'
          and tx.transaction_date between v_term1_start and v_term1_start + 13
      ), 0) as calc_amount
    from staff t
    where t.staff_number in ('STF-0004', 'STF-0005', 'STF-0006', 'STF-0007', 'STF-0008', 'STF-0009')
  loop
    insert into cash_handovers (
      teacher_id, handover_date, start_period, end_period,
      calculated_collection_amount, declared_amount, received_amount, receiver_id,
      status, notes, submitted_at, received_at
    )
    values (
      rec.teacher_id, v_term1_start + 13, v_term1_start, v_term1_start + 13,
      rec.calc_amount,
      rec.calc_amount,
      case rec.rn
        when 1 then null                   -- Draft: not yet submitted
        when 2 then null                   -- Submitted: awaiting confirmation
        when 3 then rec.calc_amount        -- Received: exact match
        when 4 then rec.calc_amount        -- Reconciled: exact match, approved
        when 5 then rec.calc_amount - 10   -- Discrepancy: short by 10
        else rec.calc_amount + 5           -- Discrepancy: over by 5, later resolved
      end,
      case when rec.rn in (1, 2) then null else v_accounts_id end,
      case rec.rn
        when 1 then 'Draft'
        when 2 then 'Submitted'
        when 3 then 'Received'
        when 4 then 'Reconciled'
        else 'Discrepancy'
      end,
      case when rec.rn in (5, 6) then 'Amount received does not match the calculated collection amount.' else null end,
      case when rec.rn = 1 then null else now() end,
      case when rec.rn in (3, 4, 5, 6) then now() else null end
    )
    returning id into v_handover_id;

    if rec.rn in (4, 5, 6) then
      insert into reconciliation_records (
        cash_handover_id, expected_amount, declared_amount, received_amount,
        resolution_note, status, resolved_by, resolved_at
      )
      values (
        v_handover_id,
        rec.calc_amount,
        rec.calc_amount,
        case rec.rn when 4 then rec.calc_amount when 5 then rec.calc_amount - 10 else rec.calc_amount + 5 end,
        case rec.rn
          when 4 then 'Amount tallies with recorded collections.'
          when 6 then 'Teacher confirmed the extra GHS 5 was a late Morning Classes payment collected after the handover form was filled; added to next period.'
          else null
        end,
        case rec.rn when 5 then 'Pending' else 'Resolved' end,
        null, -- resolved_by references profiles(id); no profile rows exist yet at seed time
        case rec.rn when 5 then null else now() end
      );
    end if;
  end loop;
end $$;

-- ============================================================================
-- System settings
-- ============================================================================
insert into system_settings (key, value)
values
  ('school_profile', jsonb_build_object(
    'school_name', 'Nyankyerenease Methodist JHS',
    'application_name', 'NKY. METH. JHS IGF Tracker',
    'address', 'Nyankyerenease, Kumasi, Ashanti Region, Ghana',
    'phone', '+233 20 000 0000',
    'currency', 'GHS',
    'receipt_footer', 'Thank you for your prompt payment. Keep this receipt for your records.'
  )),
  ('active_context', jsonb_build_object(
    'academic_year_id', (select id from academic_years where name = '2026/2027'),
    'term_id', (select id from terms where term_name = 'Term 1' limit 1)
  )),
  ('inventory', jsonb_build_object('allow_negative_stock', false));

-- ============================================================================
-- To remove this sample dataset before production use once real staff,
-- students, classes and collection types are ready, just run the truncate
-- block at the top of this file by itself (everything before the "Academic
-- year & Term 1" section) — it clears every table this script populates and
-- never touches `profiles` or `auth.users`.
-- ============================================================================
