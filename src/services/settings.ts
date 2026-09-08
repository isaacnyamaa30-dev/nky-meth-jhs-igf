import { supabase } from '@/lib/supabase'

export interface SchoolProfile {
  school_name: string
  application_name: string
  address: string
  phone: string
  currency: string
  receipt_footer: string
}

export interface InventorySettings {
  allow_negative_stock: boolean
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase.from('system_settings').select('value').eq('key', key).maybeSingle()
  if (error) throw error
  return (data?.value as T) ?? null
}

export async function updateSetting(key: string, value: Record<string, unknown>, updatedBy: string) {
  const { error } = await supabase
    .from('system_settings')
    .update({ value, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('key', key)
  if (error) throw error
}

/** Wipes sample transactions/handovers/receipts/audit history. Never
 * touches staff, students, classes or any other school structure. */
export async function clearSampleData() {
  const { error } = await supabase.rpc('fn_clear_sample_data')
  if (error) throw error
}
