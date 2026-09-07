// Hand-written types mirroring the Supabase schema (supabase/migrations).
// Once the project is linked, prefer regenerating with:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type UserRole = 'admin' | 'headteacher' | 'accounts' | 'teacher'

export type StaffStatus = 'Active' | 'Inactive' | 'Transferred' | 'Retired' | 'On Leave'

export type AdmissionStatus = 'Active' | 'Transferred' | 'Graduated' | 'Withdrawn' | 'Inactive'

export type AcademicYearStatus = 'Upcoming' | 'Active' | 'Closed'

export type TermStatus = 'Upcoming' | 'Active' | 'Closed'

export type WeekStatus = 'Upcoming' | 'Active' | 'Completed'

export type DayType =
  | 'School Day'
  | 'Holiday'
  | 'Vacation'
  | 'Public Holiday'
  | 'Special Closure'
  | 'Examination Day'
  | 'Other'

export type CollectionFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Termly' | 'Once-Off' | 'Intermittent'

export type CalculationMethod =
  | 'Fixed per student'
  | 'Fixed per class'
  | 'Variable amount'
  | 'Quantity x unit price'
  | 'General collection'

export type ObligationStatus = 'Not Paid' | 'Partially Paid' | 'Paid' | 'Waived'

export type TransactionStatus = 'Pending' | 'Confirmed' | 'Reconciled' | 'Voided' | 'Refunded'

export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Other'

export type HandoverStatus = 'Draft' | 'Submitted' | 'Received' | 'Reconciled' | 'Discrepancy'

export type ReconciliationStatus = 'Pending' | 'Resolved'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  status: 'Active' | 'Inactive'
  created_at: string
  updated_at: string
}

export interface AcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
  status: AcademicYearStatus
  created_at: string
  updated_at: string
}

export interface SchoolClass {
  id: string
  class_name: string
  academic_year_id: string
  class_teacher_id: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  profile_id: string | null
  staff_number: string
  full_name: string
  gender: 'Male' | 'Female' | 'Other' | null
  phone_number: string | null
  email: string | null
  job_title: string | null
  assigned_class_id: string | null
  user_role: UserRole
  status: StaffStatus
  date_joined: string
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  student_number: string
  full_name: string
  gender: 'Male' | 'Female' | 'Other' | null
  class_id: string
  parent_guardian_name: string | null
  parent_guardian_phone: string | null
  admission_status: AdmissionStatus
  academic_year_id: string
  created_at: string
  updated_at: string
}

export interface Term {
  id: string
  academic_year_id: string
  term_name: 'Term 1' | 'Term 2' | 'Term 3'
  start_date: string
  end_date: string
  number_of_weeks: number
  status: TermStatus
  created_at: string
  updated_at: string
}

export interface TermWeek {
  id: string
  term_id: string
  week_number: number
  start_date: string
  end_date: string
  status: WeekStatus
}

export interface SchoolCalendarDay {
  id: string
  term_id: string
  calendar_date: string
  day_type: DayType
  notes: string | null
}

export interface CollectionType {
  id: string
  name: string
  description: string | null
  frequency: CollectionFrequency
  calculation_method: CalculationMethod
  default_amount: number | null
  student_specific: boolean
  class_specific: boolean
  active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface StudentObligation {
  id: string
  student_id: string
  collection_type_id: string
  academic_year_id: string
  term_id: string
  expected_amount: number
  amount_paid: number
  waived_amount: number
  balance: number
  status: ObligationStatus
  waiver_reason: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  transaction_number: string
  receipt_number: string | null
  academic_year_id: string
  term_id: string
  week_id: string | null
  transaction_date: string
  collection_type_id: string
  student_id: string | null
  class_id: string | null
  staff_id: string
  quantity: number | null
  unit_amount: number | null
  amount: number
  payment_method: PaymentMethod
  payment_reference: string | null
  status: TransactionStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  voided_at: string | null
  voided_by: string | null
  void_reason: string | null
}

export interface Receipt {
  id: string
  transaction_id: string
  receipt_number: string
  issued_at: string
  generated_by: string | null
  pdf_url: string | null
}

export interface UniformItem {
  id: string
  item_name: string
  gender_category: 'Boys' | 'Girls' | 'Unisex'
  size: string | null
  unit_price: number
  opening_stock: number
  current_stock: number
  reorder_level: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface UniformSale {
  id: string
  student_id: string | null
  item_id: string
  quantity: number
  unit_price: number
  total_amount: number
  payment_status: 'Paid' | 'Partial' | 'Outstanding'
  payment_method: PaymentMethod
  sold_by: string
  transaction_id: string | null
  sale_date: string
  created_at: string
}

export interface CashHandover {
  id: string
  teacher_id: string
  handover_date: string
  start_period: string
  end_period: string
  calculated_collection_amount: number
  declared_amount: number
  received_amount: number | null
  receiver_id: string | null
  difference: number
  status: HandoverStatus
  notes: string | null
  submitted_at: string | null
  received_at: string | null
  created_at: string
}

export interface ReconciliationRecord {
  id: string
  cash_handover_id: string
  expected_amount: number
  declared_amount: number
  received_amount: number
  difference: number
  resolution_note: string | null
  resolved_by: string | null
  resolved_at: string | null
  status: ReconciliationStatus
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  reason: string | null
  ip_address: string | null
  created_at: string
}

export interface SystemSetting {
  key: string
  value: Record<string, unknown>
  updated_by: string | null
  updated_at: string
}
