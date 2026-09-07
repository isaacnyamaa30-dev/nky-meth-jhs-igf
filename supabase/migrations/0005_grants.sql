-- NKY. METH. JHS IGF Tracker
-- 0005_grants.sql
--
-- Row Level Security (0003_rls_policies.sql) restricts which ROWS a role can
-- see or change, but Postgres requires a baseline table-level GRANT before
-- RLS is even consulted — tables created via raw SQL do not get this
-- automatically. Without it every request fails with "permission denied"
-- regardless of how permissive the RLS policies are.
--
-- This grants broadly to `authenticated`; RLS remains the real gatekeeper
-- (e.g. `transactions` has no DELETE policy, so DELETE stays blocked for
-- everyone even though it's granted at the table level here).

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  profiles, academic_years, classes, staff, students, terms, term_weeks,
  school_calendar, collection_types, student_obligations, transactions,
  receipts, uniform_items, uniform_sales, cash_handovers,
  reconciliation_records, audit_logs, system_settings
to authenticated;

grant usage, select on sequence transaction_number_seq, receipt_number_seq to authenticated;

-- Ensure any table/sequence added later (Phase 2+) inherits the same
-- baseline access automatically, without needing another grants migration.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated;
