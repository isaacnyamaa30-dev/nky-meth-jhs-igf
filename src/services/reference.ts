import { supabase } from '@/lib/supabase'
import type { AcademicYear, Term, TermWeek } from '@/types/domain'

export async function getActiveAcademicYear(): Promise<AcademicYear | null> {
  const { data, error } = await supabase.from('academic_years').select('*').eq('status', 'Active').maybeSingle()
  if (error) throw error
  return data
}

export async function getActiveTerm(): Promise<Term | null> {
  const { data, error } = await supabase.from('terms').select('*').eq('status', 'Active').maybeSingle()
  if (error) throw error
  return data
}

/**
 * The current week, computed from today's date rather than a stored
 * `status` column — that column is only a one-time snapshot, so it can go
 * stale (weeks only cover Mon-Fri, so a plain `status = 'Active'` lookup
 * matches nothing at all on a weekend). `fn_current_week_id` falls back to
 * the next upcoming week, or the most recently finished one, accordingly.
 */
export async function getActiveWeek(termId: string): Promise<TermWeek | null> {
  const { data: weekId, error: rpcError } = await supabase.rpc('fn_current_week_id', { p_term_id: termId })
  if (rpcError) throw rpcError
  if (!weekId) return null

  const { data, error } = await supabase.from('term_weeks').select('*').eq('id', weekId).maybeSingle()
  if (error) throw error
  return data
}

export async function getActiveContext() {
  const term = await getActiveTerm()
  const week = term ? await getActiveWeek(term.id) : null
  return { term, week }
}
