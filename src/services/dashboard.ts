import { supabase } from '@/lib/supabase'

export interface DashboardSummary {
  total_collected: number
  today_collected: number
  week_collected: number
  term_collected: number
  pta_total: number
  morning_total: number
  sports_total: number
  worship_total: number
  uniform_total: number
  other_total: number
  outstanding_levies: number
  awaiting_handover: number
  reconciled_amount: number
  transaction_count: number
}

export async function fetchDashboardSummary(termId: string): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('fn_dashboard_summary', { p_term_id: termId }).single()
  if (error) throw error
  return data as DashboardSummary
}

export interface WeeklyTrendPoint {
  week_number: number
  total: number
}

export async function fetchWeeklyTrend(termId: string): Promise<WeeklyTrendPoint[]> {
  const { data, error } = await supabase.rpc('fn_weekly_trend', { p_term_id: termId })
  if (error) throw error
  return (data ?? []) as WeeklyTrendPoint[]
}

export interface CategoryTotal {
  category: string
  total: number
}

export async function fetchCategoryBreakdown(termId: string): Promise<CategoryTotal[]> {
  const { data, error } = await supabase.rpc('fn_category_breakdown', { p_term_id: termId })
  if (error) throw error
  return (data ?? []) as CategoryTotal[]
}

export interface PaymentStatusTotal {
  status: string
  total_balance: number
  obligation_count: number
}

export async function fetchPaymentStatusBreakdown(termId: string): Promise<PaymentStatusTotal[]> {
  const { data, error } = await supabase.rpc('fn_payment_status_breakdown', { p_term_id: termId })
  if (error) throw error
  return (data ?? []) as PaymentStatusTotal[]
}
