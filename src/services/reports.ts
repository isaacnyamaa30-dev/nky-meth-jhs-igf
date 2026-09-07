import { supabase } from '@/lib/supabase'

export interface DailyReportRow {
  category: string
  transaction_count: number
  amount: number
}

export interface DailyTransactionDetail {
  id: string
  transaction_number: string
  category: string
  collector: string
  amount: number
  status: string
}

export async function fetchDailyReport(date: string): Promise<{ rows: DailyReportRow[]; details: DailyTransactionDetail[] }> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, transaction_number, amount, status, collection_types:collection_type_id(name), staff:staff_id(full_name)')
    .eq('transaction_date', date)
    .neq('status', 'Voided')

  if (error) throw error

  const details: DailyTransactionDetail[] = (data ?? []).map((t) => ({
    id: t.id,
    transaction_number: t.transaction_number,
    category: (t.collection_types as unknown as { name: string } | null)?.name ?? '—',
    collector: (t.staff as unknown as { full_name: string } | null)?.full_name ?? '—',
    amount: Number(t.amount),
    status: t.status,
  }))

  const byCategory = new Map<string, DailyReportRow>()
  for (const d of details) {
    const existing = byCategory.get(d.category) ?? { category: d.category, transaction_count: 0, amount: 0 }
    existing.transaction_count += 1
    existing.amount += d.amount
    byCategory.set(d.category, existing)
  }

  return { rows: Array.from(byCategory.values()).sort((a, b) => b.amount - a.amount), details }
}

export interface TermReportRow {
  week_number: number
  pta: number
  morning: number
  sports: number
  worship: number
  uniform: number
  other: number
  total: number
}

export async function fetchTermReport(termId: string): Promise<TermReportRow[]> {
  const { data, error } = await supabase.rpc('fn_term_report', { p_term_id: termId })
  if (error) throw error
  return (data ?? []) as TermReportRow[]
}

export interface StaffReportRow {
  staff_id: string
  staff_name: string
  transaction_count: number
  total_collected: number
  handed_over: number
  outstanding_handover: number
}

export async function fetchStaffCollectionReport(termId: string): Promise<StaffReportRow[]> {
  const { data, error } = await supabase.rpc('fn_staff_collection_report', { p_term_id: termId })
  if (error) throw error
  return (data ?? []) as StaffReportRow[]
}

export interface StudentObligationRow {
  id: string
  collection_type: string
  expected_amount: number
  amount_paid: number
  waived_amount: number
  balance: number
  status: string
}

export interface StudentTransactionRow {
  id: string
  transaction_date: string
  transaction_number: string
  receipt_number: string | null
  category: string
  amount: number
  payment_method: string
  status: string
}

export async function fetchStudentStatement(
  studentId: string,
): Promise<{ obligations: StudentObligationRow[]; transactions: StudentTransactionRow[] }> {
  const [{ data: obligations, error: obError }, { data: txns, error: txError }] = await Promise.all([
    supabase
      .from('student_obligations')
      .select('id, expected_amount, amount_paid, waived_amount, balance, status, collection_types:collection_type_id(name)')
      .eq('student_id', studentId),
    supabase
      .from('transactions')
      .select('id, transaction_date, transaction_number, receipt_number, amount, payment_method, status, collection_types:collection_type_id(name)')
      .eq('student_id', studentId)
      .order('transaction_date', { ascending: false }),
  ])
  if (obError) throw obError
  if (txError) throw txError

  return {
    obligations: (obligations ?? []).map((o) => ({
      id: o.id,
      collection_type: (o.collection_types as unknown as { name: string } | null)?.name ?? '—',
      expected_amount: Number(o.expected_amount),
      amount_paid: Number(o.amount_paid),
      waived_amount: Number(o.waived_amount),
      balance: Number(o.balance),
      status: o.status,
    })),
    transactions: (txns ?? []).map((t) => ({
      id: t.id,
      transaction_date: t.transaction_date,
      transaction_number: t.transaction_number,
      receipt_number: t.receipt_number,
      category: (t.collection_types as unknown as { name: string } | null)?.name ?? '—',
      amount: Number(t.amount),
      payment_method: t.payment_method,
      status: t.status,
    })),
  }
}
