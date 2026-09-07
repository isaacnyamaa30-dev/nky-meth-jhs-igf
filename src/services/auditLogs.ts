import { supabase } from '@/lib/supabase'
import type { AuditLog } from '@/types/domain'

export interface AuditLogWithUser extends AuditLog {
  profiles: { full_name: string } | null
}

export async function listAuditLogs(filters: { entityType?: string; action?: string } = {}): Promise<AuditLogWithUser[]> {
  let query = supabase
    .from('audit_logs')
    .select('*, profiles:user_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (filters.entityType) query = query.eq('entity_type', filters.entityType)
  if (filters.action) query = query.eq('action', filters.action)

  const { data, error } = await query
  if (error) throw error
  return data as unknown as AuditLogWithUser[]
}

export const AUDIT_ENTITY_TYPES = [
  'staff',
  'students',
  'classes',
  'collection_types',
  'transactions',
  'cash_handovers',
  'uniform_items',
  'academic_years',
  'terms',
]

export const AUDIT_ACTIONS = ['Create', 'Update', 'Void', 'Delete']
