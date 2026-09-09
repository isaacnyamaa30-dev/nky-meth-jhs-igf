-- NKY. METH. JHS IGF Tracker
-- 0010_service_role_grants.sql
--
-- 0005_grants.sql granted table/sequence access to `authenticated` (needed
-- before RLS is even evaluated - see that file's comment), but never
-- explicitly to `service_role`. service_role normally bypasses RLS and has
-- full access inherently, but the invite-staff Edge Function hit a genuine
-- "permission denied for table profiles" (42501) from its service-role
-- client - a baseline GRANT issue, the same class of bug as 0005, just for
-- a different role. Granting explicitly is always safe for service_role
-- (it already has full access by design) and fixes this regardless of the
-- exact cause.

grant usage on schema public to service_role;

grant select, insert, update, delete on
  profiles, academic_years, classes, staff, students, terms, term_weeks,
  school_calendar, collection_types, student_obligations, transactions,
  receipts, uniform_items, uniform_sales, cash_handovers,
  reconciliation_records, audit_logs, system_settings
to service_role;

grant usage, select on sequence transaction_number_seq, receipt_number_seq to service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;
