import { supabase } from '@/lib/supabase'
import type { CalculationMethod, CollectionFrequency, CollectionType } from '@/types/domain'

export async function listCollectionTypes(activeOnly = false): Promise<CollectionType[]> {
  let query = supabase.from('collection_types').select('*').order('name')
  if (activeOnly) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export interface CollectionTypeFormValues {
  name: string
  description: string
  frequency: CollectionFrequency
  calculation_method: CalculationMethod
  default_amount: string
  student_specific: boolean
  class_specific: boolean
}

export async function createCollectionType(values: CollectionTypeFormValues) {
  const { error } = await supabase.from('collection_types').insert({
    name: values.name,
    description: values.description || null,
    frequency: values.frequency,
    calculation_method: values.calculation_method,
    default_amount: values.default_amount ? Number(values.default_amount) : null,
    student_specific: values.student_specific,
    class_specific: values.class_specific,
  })
  if (error) throw error
}

export async function updateCollectionTypeAmount(id: string, default_amount: number) {
  const { error } = await supabase.from('collection_types').update({ default_amount }).eq('id', id)
  if (error) throw error
}

export async function setCollectionTypeActive(id: string, active: boolean) {
  const { error } = await supabase.from('collection_types').update({ active }).eq('id', id)
  if (error) throw error
}
