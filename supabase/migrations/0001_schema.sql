-- NKY. METH. JHS IGF Tracker
-- 0001_schema.sql
-- Core tables for staff, students, classes, academic calendar, collections,
-- transactions, uniform sales, cash handovers, reconciliation and audit.

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. profiles  (mirrors auth.users, carries application role)
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'headteacher', 'accounts', 'teacher')),
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Application-level identity + role for each auth.users account.';

-- ============================================================================
-- 2. academic_years
-- ============================================================================
create table academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null,
  status text not null default 'Upcoming' check (status in ('Upcoming', 'Active', 'Closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_dates_chk check (end_date > start_date)
);

-- Only one academic year may be Active at a time.
create unique index academic_years_one_active_idx on academic_years (status) where (status = 'Active');

-- ============================================================================
-- 3. classes
-- ============================================================================
create table classes (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  academic_year_id uuid not null references academic_years (id) on delete restrict,
  class_teacher_id uuid, -- FK to staff added after staff table is created
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, class_name)
);

-- ============================================================================
-- 4. staff
-- ============================================================================
create table staff (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles (id) on delete set null,
  staff_number text not null unique,
  full_name text not null,
  gender text check (gender in ('Male', 'Female', 'Other')),
  phone_number text,
  email text unique,
  job_title text,
  assigned_class_id uuid references classes (id) on delete set null,
  user_role text not null check (user_role in ('admin', 'headteacher', 'accounts', 'teacher')),
  status text not null default 'Active' check (status in ('Active', 'Inactive', 'Transferred', 'Retired', 'On Leave')),
  date_joined date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table classes
  add constraint classes_class_teacher_id_fkey
  foreign key (class_teacher_id) references staff (id) on delete set null;

create index staff_status_idx on staff (status);
create index staff_assigned_class_idx on staff (assigned_class_id);

-- ============================================================================
-- 5. students
-- ============================================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique,
  full_name text not null,
  gender text check (gender in ('Male', 'Female', 'Other')),
  class_id uuid not null references classes (id) on delete restrict,
  parent_guardian_name text,
  parent_guardian_phone text,
  admission_status text not null default 'Active' check (admission_status in ('Active', 'Transferred', 'Graduated', 'Withdrawn', 'Inactive')),
  academic_year_id uuid not null references academic_years (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_class_idx on students (class_id);
create index students_academic_year_idx on students (academic_year_id);
create index students_admission_status_idx on students (admission_status);
create index students_full_name_idx on students using gin (to_tsvector('simple', full_name));

-- ============================================================================
-- 6. terms
-- ============================================================================
create table terms (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years (id) on delete cascade,
  term_name text not null check (term_name in ('Term 1', 'Term 2', 'Term 3')),
  start_date date not null,
  end_date date not null,
  number_of_weeks integer not null default 14 check (number_of_weeks > 0),
  status text not null default 'Upcoming' check (status in ('Upcoming', 'Active', 'Closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, term_name),
  constraint terms_dates_chk check (end_date > start_date)
);

create unique index terms_one_active_idx on terms (status) where (status = 'Active');

-- ============================================================================
-- 7. term_weeks
-- ============================================================================
create table term_weeks (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references terms (id) on delete cascade,
  week_number integer not null check (week_number > 0),
  start_date date not null,
  end_date date not null,
  status text not null default 'Upcoming' check (status in ('Upcoming', 'Active', 'Completed')),
  unique (term_id, week_number)
);

create index term_weeks_term_idx on term_weeks (term_id);
create index term_weeks_dates_idx on term_weeks (start_date, end_date);

-- ============================================================================
-- 8. school_calendar
-- ============================================================================
create table school_calendar (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references terms (id) on delete cascade,
  calendar_date date not null,
  day_type text not null default 'School Day' check (
    day_type in ('School Day', 'Holiday', 'Vacation', 'Public Holiday', 'Special Closure', 'Examination Day', 'Other')
  ),
  notes text,
  unique (term_id, calendar_date)
);

create index school_calendar_date_idx on school_calendar (calendar_date);

-- ============================================================================
-- 9. collection_types
-- ============================================================================
create table collection_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  frequency text not null check (frequency in ('Daily', 'Weekly', 'Monthly', 'Termly', 'Once-Off', 'Intermittent')),
  calculation_method text not null check (
    calculation_method in ('Fixed per student', 'Fixed per class', 'Variable amount', 'Quantity x unit price', 'General collection')
  ),
  default_amount numeric(12, 2) check (default_amount is null or default_amount >= 0),
  student_specific boolean not null default false,
  class_specific boolean not null default false,
  active boolean not null default true,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 10. student_obligations
-- ============================================================================
create table student_obligations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  collection_type_id uuid not null references collection_types (id) on delete restrict,
  academic_year_id uuid not null references academic_years (id) on delete restrict,
  term_id uuid not null references terms (id) on delete restrict,
  expected_amount numeric(12, 2) not null check (expected_amount >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  waived_amount numeric(12, 2) not null default 0 check (waived_amount >= 0),
  balance numeric(12, 2) generated always as (expected_amount - amount_paid - waived_amount) stored,
  status text not null default 'Not Paid' check (status in ('Not Paid', 'Partially Paid', 'Paid', 'Waived')),
  waiver_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, collection_type_id, term_id)
);

create index student_obligations_student_idx on student_obligations (student_id);
create index student_obligations_term_idx on student_obligations (term_id);
create index student_obligations_status_idx on student_obligations (status);

-- ============================================================================
-- 11. transactions (authoritative financial ledger)
-- ============================================================================
create table transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text not null unique,
  receipt_number text unique,
  academic_year_id uuid not null references academic_years (id) on delete restrict,
  term_id uuid not null references terms (id) on delete restrict,
  week_id uuid references term_weeks (id) on delete restrict,
  transaction_date date not null default current_date,
  collection_type_id uuid not null references collection_types (id) on delete restrict,
  student_id uuid references students (id) on delete restrict,
  class_id uuid references classes (id) on delete restrict,
  staff_id uuid not null references staff (id) on delete restrict,
  quantity integer check (quantity is null or quantity > 0),
  unit_amount numeric(12, 2) check (unit_amount is null or unit_amount >= 0),
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'Mobile Money', 'Bank Transfer', 'Other')),
  payment_reference text,
  status text not null default 'Confirmed' check (status in ('Pending', 'Confirmed', 'Reconciled', 'Voided', 'Refunded')),
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references profiles (id) on delete set null,
  void_reason text,
  constraint transactions_void_reason_chk check (status <> 'Voided' or void_reason is not null)
);

create index transactions_date_idx on transactions (transaction_date);
create index transactions_term_week_idx on transactions (term_id, week_id);
create index transactions_collection_type_idx on transactions (collection_type_id);
create index transactions_student_idx on transactions (student_id);
create index transactions_class_idx on transactions (class_id);
create index transactions_staff_idx on transactions (staff_id);
create index transactions_status_idx on transactions (status);

-- ============================================================================
-- 12. receipts
-- ============================================================================
create table receipts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references transactions (id) on delete cascade,
  receipt_number text not null unique,
  issued_at timestamptz not null default now(),
  generated_by uuid references profiles (id) on delete set null,
  pdf_url text
);

-- ============================================================================
-- 13. uniform_items
-- ============================================================================
create table uniform_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  gender_category text not null default 'Unisex' check (gender_category in ('Boys', 'Girls', 'Unisex')),
  size text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  opening_stock integer not null default 0 check (opening_stock >= 0),
  current_stock integer not null default 0 check (current_stock >= 0),
  reorder_level integer not null default 5 check (reorder_level >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_name, size)
);

-- ============================================================================
-- 14. uniform_sales
-- ============================================================================
create table uniform_sales (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students (id) on delete restrict,
  item_id uuid not null references uniform_items (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_amount numeric(12, 2) generated always as (quantity * unit_price) stored,
  payment_status text not null default 'Paid' check (payment_status in ('Paid', 'Partial', 'Outstanding')),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'Mobile Money', 'Bank Transfer', 'Other')),
  sold_by uuid not null references staff (id) on delete restrict,
  transaction_id uuid references transactions (id) on delete set null,
  sale_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index uniform_sales_item_idx on uniform_sales (item_id);
create index uniform_sales_student_idx on uniform_sales (student_id);
create index uniform_sales_date_idx on uniform_sales (sale_date);

-- ============================================================================
-- 15. cash_handovers
-- ============================================================================
create table cash_handovers (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references staff (id) on delete restrict,
  handover_date date not null default current_date,
  start_period date not null,
  end_period date not null,
  calculated_collection_amount numeric(12, 2) not null default 0,
  declared_amount numeric(12, 2) not null,
  received_amount numeric(12, 2),
  receiver_id uuid references staff (id) on delete set null,
  difference numeric(12, 2) generated always as (coalesce(received_amount, 0) - calculated_collection_amount) stored,
  status text not null default 'Draft' check (status in ('Draft', 'Submitted', 'Received', 'Reconciled', 'Discrepancy')),
  notes text,
  submitted_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  constraint cash_handovers_period_chk check (end_period >= start_period)
);

create index cash_handovers_teacher_idx on cash_handovers (teacher_id);
create index cash_handovers_status_idx on cash_handovers (status);

-- ============================================================================
-- 16. reconciliation_records
-- ============================================================================
create table reconciliation_records (
  id uuid primary key default gen_random_uuid(),
  cash_handover_id uuid not null references cash_handovers (id) on delete cascade,
  expected_amount numeric(12, 2) not null,
  declared_amount numeric(12, 2) not null,
  received_amount numeric(12, 2) not null,
  difference numeric(12, 2) generated always as (received_amount - expected_amount) stored,
  resolution_note text,
  resolved_by uuid references profiles (id) on delete set null,
  resolved_at timestamptz,
  status text not null default 'Pending' check (status in ('Pending', 'Resolved')),
  created_at timestamptz not null default now(),
  constraint reconciliation_note_chk check (difference = 0 or resolution_note is not null or status = 'Pending')
);

create index reconciliation_records_handover_idx on reconciliation_records (cash_handover_id);

-- ============================================================================
-- 17. audit_logs (append-only)
-- ============================================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  reason text,
  ip_address text,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);
create index audit_logs_user_idx on audit_logs (user_id);
create index audit_logs_created_at_idx on audit_logs (created_at);

-- ============================================================================
-- 18. system_settings (key/value store)
-- ============================================================================
create table system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
