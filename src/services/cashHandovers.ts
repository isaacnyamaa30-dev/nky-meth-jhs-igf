import { supabase } from '@/lib/supabase'
import type { CashHandover } from '@/types/domain'

export interface CashHandoverWithNames extends CashHandover {
  teacher: { full_name: string } | null
  receiver: { full_name: string } | null
}

export async function listCashHandovers(): Promise<CashHandoverWithNames[]> {
  const { data, error } = await supabase
    .from('cash_handovers')
    .select('*, teacher:teacher_id(full_name), receiver:receiver_id(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as CashHandoverWithNames[]
}

/** Sums a teacher's own confirmed collections within a period — the same
 * authoritative transactions table every report reads from. */
export async function calculateCollectionAmount(staffId: string, startDate: string, endDate: string): Promise<number> {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('staff_id', staffId)
    .in('status', ['Confirmed', 'Reconciled'])
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
  if (error) throw error
  return (data ?? []).reduce((sum, t) => sum + Number(t.amount), 0)
}

export interface HandoverFormValues {
  teacher_id: string
  handover_date: string
  start_period: string
  end_period: string
  declared_amount: number
  notes: string
}

export async function submitHandover(values: HandoverFormValues) {
  const calculated = await calculateCollectionAmount(values.teacher_id, values.start_period, values.end_period)
  const { error } = await supabase.from('cash_handovers').insert({
    teacher_id: values.teacher_id,
    handover_date: values.handover_date,
    start_period: values.start_period,
    end_period: values.end_period,
    calculated_collection_amount: calculated,
    declared_amount: values.declared_amount,
    notes: values.notes || null,
    status: 'Submitted',
    submitted_at: new Date().toISOString(),
  })
  if (error) throw error
  return calculated
}

export async function confirmReceipt(id: string, receiverId: string, receivedAmount: number) {
  const { error } = await supabase
    .from('cash_handovers')
    .update({ received_amount: receivedAmount, receiver_id: receiverId })
    .eq('id', id)
  if (error) throw error
}

export async function resolveDiscrepancy(handover: CashHandover, profileId: string, resolutionNote: string) {
  const { error: recError } = await supabase.from('reconciliation_records').insert({
    cash_handover_id: handover.id,
    expected_amount: handover.calculated_collection_amount,
    declared_amount: handover.declared_amount,
    received_amount: handover.received_amount ?? 0,
    resolution_note: resolutionNote,
    status: 'Resolved',
    resolved_by: profileId,
    resolved_at: new Date().toISOString(),
  })
  if (recError) throw recError

  const { error: handoverError } = await supabase.from('cash_handovers').update({ status: 'Reconciled' }).eq('id', handover.id)
  if (handoverError) throw handoverError
}

export async function markReconciled(id: string) {
  const { error } = await supabase.from('cash_handovers').update({ status: 'Reconciled' }).eq('id', id)
  if (error) throw error
}
