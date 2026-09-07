-- NKY. METH. JHS IGF Tracker
-- 0006_staff_profile_sync.sql
--
-- A staff record and its login account (profiles) carry role/name in two
-- places (staff.user_role/full_name for HR records that can exist before an
-- account is created; profiles.role/full_name for RBAC, which RLS actually
-- reads via fn_current_role()). Whenever an admin links or edits a staff
-- record that has a linked account, keep the profile in sync here — in the
-- database — so it can never be forgotten by an app code path.

create or replace function fn_sync_staff_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id is not null then
    update profiles
    set role = new.user_role, full_name = new.full_name
    where id = new.profile_id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_staff_profile
after insert or update of profile_id, user_role, full_name on staff
for each row execute function fn_sync_staff_profile();
