import { supabase } from '@/lib/supabase'
import type { PaymentMethod, Transaction } from '@/types/domain'

export interface TransactionWithDetails extends Transaction {
  collection_types: { name: string } | null
  students: { full_name: string; student_number: string } | null
  classes: { class_name: string } | null
  staff: { full_name: string } | null
}

export async function listRecentTransactions(limit = 100): Promise<TransactionWithDetails[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      '*, collection_types:collection_type_id(name), students:student_id(full_name, student_number), classes:class_id(class_name), staff:staff_id(full_name)',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as unknown as TransactionWithDetails[]
}

export interface SingleTransactionInput {
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
  notes: string | null
}

export async function findPossibleDuplicate(input: {
  student_id: string | null
  collection_type_id: string
  transaction_date: string
  amount: number
}): Promise<boolean> {
  if (!input.student_id) return false
  const { data, error } = await supabase
    .from('transactions')
    .select('id')
    .eq('student_id', input.student_id)
    .eq('collection_type_id', input.collection_type_id)
    .eq('transaction_date', input.transaction_date)
    .eq('amount', input.amount)
    .neq('status', 'Voided')
    .limit(1)
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function createTransaction(input: SingleTransactionInput) {
  const { error } = await supabase.from('transactions').insert(input)
  if (error) throw error
}

export async function createBatchTransactions(rows: SingleTransactionInput[]) {
  const { error } = await supabase.from('transactions').insert(rows)
  if (error) throw error
}

export async function voidTransaction(id: string, reason: string) {
  const { error } = await supabase.from('transactions').update({ status: 'Voided', void_reason: reason }).eq('id', id)
  if (error) throw error
}
