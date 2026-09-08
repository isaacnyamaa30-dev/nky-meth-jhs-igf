-- NKY. METH. JHS IGF Tracker
-- 0009_clear_sample_data.sql
--
-- A one-click "reset before go-live" action for the admin. Transactions,
-- cash handovers, receipts and audit logs deliberately have no DELETE
-- policy anywhere in the app (see 0003_rls_policies.sql) so that nobody -
-- including an admin - can quietly erase financial history through the
-- normal UI. That protection is exactly right for day-to-day use, but it
-- also means the one legitimate case of wiping the *fictional seed*
-- transactions before real collections start needs its own narrow,
-- explicitly-audited escape hatch rather than a blanket DELETE grant.
--
-- Deliberately scoped to transactional/history data only - it never
-- touches staff, students, classes, collection_types, uniform_items,
-- academic_years or terms, so it can never delete the admin's own linked
-- account or any school structure already set up. Sample staff/students
-- are removed individually via the Staff/Students pages instead, where
-- there's no risk of catching a real record.

create or replace function fn_clear_sample_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if fn_current_role() <> 'admin' then
    raise exception 'Only an administrator can clear sample data.';
  end if;

  truncate table
    audit_logs, reconciliation_records, cash_handovers, uniform_sales,
    receipts, transactions, student_obligations
  cascade;

  alter sequence transaction_number_seq restart with 1;
  alter sequence receipt_number_seq restart with 1;

  update uniform_items set current_stock = opening_stock;

  insert into audit_logs (user_id, action, entity_type, entity_id, reason)
  values (auth.uid(), 'Delete', 'sample_data', null, 'Cleared all sample transactions and financial history before go-live.');
end;
$$;

grant execute on function fn_clear_sample_data() to authenticated;
