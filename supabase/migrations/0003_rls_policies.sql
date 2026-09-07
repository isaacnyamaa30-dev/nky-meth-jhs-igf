-- NKY. METH. JHS IGF Tracker
-- 0003_rls_policies.sql
-- Row Level Security. Authorization is enforced here, not just hidden UI.
--
-- Roles (profiles.role / staff.user_role): admin, headteacher, accounts, teacher.

create or replace function fn_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function fn_current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from staff where profile_id = auth.uid();
$$;

create or replace function fn_is_back_office()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fn_current_role() in ('admin', 'headteacher', 'accounts');
$$;

alter table profiles enable row level security;
alter table academic_years enable row level security;
alter table classes enable row level security;
alter table staff enable row level security;
alter table students enable row level security;
alter table terms enable row level security;
alter table term_weeks enable row level security;
alter table school_calendar enable row level security;
alter table collection_types enable row level security;
alter table student_obligations enable row level security;
alter table transactions enable row level security;
alter table receipts enable row level security;
alter table uniform_items enable row level security;
alter table uniform_sales enable row level security;
alter table cash_handovers enable row level security;
alter table reconciliation_records enable row level security;
alter table audit_logs enable row level security;
alter table system_settings enable row level security;

-- ============================================================================
-- profiles
-- ============================================================================
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or fn_current_role() = 'admin');

create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid() or fn_current_role() = 'admin')
  with check (id = auth.uid() or fn_current_role() = 'admin');

-- ============================================================================
-- Reference / configuration data: readable by all signed-in staff,
-- writable by admin only.
-- ============================================================================
create policy academic_years_select on academic_years for select to authenticated using (true);
create policy academic_years_write on academic_years for all to authenticated
  using (fn_current_role() = 'admin') with check (fn_current_role() = 'admin');

create policy terms_select on terms for select to authenticated using (true);
create policy terms_write on terms for all to authenticated
  using (fn_current_role() = 'admin') with check (fn_current_role() = 'admin');

create policy term_weeks_select on term_weeks for select to authenticated using (true);
create policy term_weeks_write on term_weeks for all to authenticated
  using (fn_current_role() = 'admin') with check (fn_current_role() = 'admin');

create policy school_calendar_select on school_calendar for select to authenticated using (true);
create policy school_calendar_write on school_calendar for all to authenticated
  using (fn_current_role() = 'admin') with check (fn_current_role() = 'admin');

create policy classes_select on classes for select to authenticated using (true);
create policy classes_write on classes for all to authenticated
  using (fn_current_role() = 'admin') with check (fn_current_role() = 'admin');

create policy collection_types_select on collection_types for select to authenticated using (true);
create policy collection_types_write on collection_types for all to authenticated
  using (fn_current_role() = 'admin') with check (fn_current_role() = 'admin');

create policy uniform_items_select on uniform_items for select to authenticated using (true);
create policy uniform_items_write on uniform_items for all to authenticated
  using (fn_current_role() = 'admin') with check (fn_current_role() = 'admin');

create policy system_settings_select on system_settings for select to authenticated using (true);
create policy system_settings_write on system_settings for all to authenticated
  using (fn_current_role() = 'admin') with check (fn_current_role() = 'admin');

-- ============================================================================
-- staff  (directory read is broad; edits are admin-only)
-- ============================================================================
create policy staff_select on staff for select to authenticated using (true);
create policy staff_write on staff for all to authenticated
  using (fn_current_role() = 'admin') with check (fn_current_role() = 'admin');

-- ============================================================================
-- students
-- ============================================================================
create policy students_select on students for select to authenticated
  using (
    fn_is_back_office()
    or class_id in (select assigned_class_id from staff where id = fn_current_staff_id())
  );

create policy students_write on students for all to authenticated
  using (fn_current_role() = 'admin') with check (fn_current_role() = 'admin');

-- ============================================================================
-- student_obligations
-- ============================================================================
create policy student_obligations_select on student_obligations for select to authenticated
  using (
    fn_is_back_office()
    or student_id in (
      select s.id from students s
      join staff st on st.assigned_class_id = s.class_id
      where st.id = fn_current_staff_id()
    )
  );

create policy student_obligations_write on student_obligations for all to authenticated
  using (fn_current_role() in ('admin', 'accounts'))
  with check (fn_current_role() in ('admin', 'accounts'));

-- ============================================================================
-- transactions (core financial ledger)
-- ============================================================================
create policy transactions_select on transactions for select to authenticated
  using (fn_is_back_office() or staff_id = fn_current_staff_id());

create policy transactions_insert on transactions for insert to authenticated
  with check (
    fn_current_role() in ('admin', 'accounts', 'teacher')
    and (staff_id = fn_current_staff_id() or fn_current_role() = 'admin')
  );

-- Only admin/accounts may edit or void a transaction after creation; a
-- teacher may only amend their own record while it is still Pending.
create policy transactions_update on transactions for update to authenticated
  using (
    fn_current_role() in ('admin', 'accounts')
    or (staff_id = fn_current_staff_id() and status = 'Pending')
  )
  with check (
    fn_current_role() in ('admin', 'accounts')
    or (staff_id = fn_current_staff_id())
  );
-- No delete policy: confirmed financial transactions are never deleted, only voided.

-- ============================================================================
-- receipts
-- ============================================================================
create policy receipts_select on receipts for select to authenticated
  using (
    fn_is_back_office()
    or transaction_id in (select id from transactions where staff_id = fn_current_staff_id())
  );

-- ============================================================================
-- uniform_sales
-- ============================================================================
create policy uniform_sales_select on uniform_sales for select to authenticated
  using (fn_is_back_office() or sold_by = fn_current_staff_id());

create policy uniform_sales_insert on uniform_sales for insert to authenticated
  with check (
    fn_current_role() in ('admin', 'accounts', 'teacher')
    and (sold_by = fn_current_staff_id() or fn_current_role() = 'admin')
  );

create policy uniform_sales_update on uniform_sales for update to authenticated
  using (fn_current_role() in ('admin', 'accounts'))
  with check (fn_current_role() in ('admin', 'accounts'));

-- ============================================================================
-- cash_handovers
-- ============================================================================
create policy cash_handovers_select on cash_handovers for select to authenticated
  using (fn_is_back_office() or teacher_id = fn_current_staff_id());

create policy cash_handovers_insert on cash_handovers for insert to authenticated
  with check (
    teacher_id = fn_current_staff_id() or fn_current_role() in ('admin', 'accounts')
  );

create policy cash_handovers_update on cash_handovers for update to authenticated
  using (
    fn_current_role() in ('admin', 'accounts')
    or (teacher_id = fn_current_staff_id() and status = 'Draft')
  )
  with check (
    fn_current_role() in ('admin', 'accounts') or teacher_id = fn_current_staff_id()
  );

-- ============================================================================
-- reconciliation_records
-- ============================================================================
create policy reconciliation_select on reconciliation_records for select to authenticated
  using (fn_is_back_office());

create policy reconciliation_write on reconciliation_records for all to authenticated
  using (fn_current_role() in ('admin', 'accounts'))
  with check (fn_current_role() in ('admin', 'accounts'));

-- ============================================================================
-- audit_logs (read-only to admin; all writes come from SECURITY DEFINER triggers)
-- ============================================================================
create policy audit_logs_select on audit_logs for select to authenticated
  using (fn_current_role() = 'admin');
