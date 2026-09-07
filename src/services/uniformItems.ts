import { supabase } from '@/lib/supabase'
import type { UniformItem } from '@/types/domain'

export async function listUniformItems(activeOnly = false): Promise<UniformItem[]> {
  let query = supabase.from('uniform_items').select('*').order('item_name').order('size')
  if (activeOnly) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export interface UniformItemFormValues {
  item_name: string
  gender_category: 'Boys' | 'Girls' | 'Unisex'
  size: string
  unit_price: number
  opening_stock: number
  reorder_level: number
}

export async function createUniformItem(values: UniformItemFormValues) {
  const { error } = await supabase.from('uniform_items').insert({
    item_name: values.item_name,
    gender_category: values.gender_category,
    size: values.size || null,
    unit_price: values.unit_price,
    opening_stock: values.opening_stock,
    current_stock: values.opening_stock,
    reorder_level: values.reorder_level,
  })
  if (error) throw error
}

export async function updateUniformItem(
  id: string,
  values: Pick<UniformItemFormValues, 'unit_price' | 'reorder_level'> & { current_stock: number },
) {
  const { error } = await supabase
    .from('uniform_items')
    .update({ unit_price: values.unit_price, reorder_level: values.reorder_level, current_stock: values.current_stock })
    .eq('id', id)
  if (error) throw error
}

export async function updateUniformItemPrice(id: string, unit_price: number) {
  const { error } = await supabase.from('uniform_items').update({ unit_price }).eq('id', id)
  if (error) throw error
}

export async function setUniformItemActive(id: string, active: boolean) {
  const { error } = await supabase.from('uniform_items').update({ active }).eq('id', id)
  if (error) throw error
}
