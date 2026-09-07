import { supabase } from '@/lib/supabase'
import type { AcademicYear, Term } from '@/types/domain'

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const { data, error } = await supabase.from('academic_years').select('*').order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export interface AcademicYearFormValues {
  name: string
  start_date: string
  end_date: string
}

export async function createAcademicYear(values: AcademicYearFormValues) {
  const { error } = await supabase.from('academic_years').insert({ ...values, status: 'Upcoming' })
  if (error) throw error
}

export async function setActiveAcademicYear(id: string) {
  const { data: current } = await supabase.from('academic_years').select('id').eq('status', 'Active').maybeSingle()
  if (current && current.id !== id) {
    const { error: closeError } = await supabase.from('academic_years').update({ status: 'Closed' }).eq('id', current.id)
    if (closeError) throw closeError
  }
  const { error } = await supabase.from('academic_years').update({ status: 'Active' }).eq('id', id)
  if (error) throw error
}

export interface TermWithYear extends Term {
  academic_years: { name: string } | null
}

export async function listTerms(): Promise<TermWithYear[]> {
  const { data, error } = await supabase
    .from('terms')
    .select('*, academic_years:academic_year_id(name)')
    .order('start_date', { ascending: false })
  if (error) throw error
  return data as unknown as TermWithYear[]
}

export interface TermFormValues {
  academic_year_id: string
  term_name: 'Term 1' | 'Term 2' | 'Term 3'
  start_date: string
  number_of_weeks: number
}

export async function createTerm(values: TermFormValues) {
  const start = new Date(values.start_date + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + values.number_of_weeks * 7 - 1)

  const { error } = await supabase.from('terms').insert({
    academic_year_id: values.academic_year_id,
    term_name: values.term_name,
    start_date: values.start_date,
    end_date: end.toISOString().slice(0, 10),
    number_of_weeks: values.number_of_weeks,
    status: 'Upcoming',
  })
  if (error) throw error
}

export async function setActiveTerm(id: string) {
  const { data: current } = await supabase.from('terms').select('id').eq('status', 'Active').maybeSingle()
  if (current && current.id !== id) {
    const { error: closeError } = await supabase.from('terms').update({ status: 'Closed' }).eq('id', current.id)
    if (closeError) throw closeError
  }
  const { error } = await supabase.from('terms').update({ status: 'Active' }).eq('id', id)
  if (error) throw error
}
