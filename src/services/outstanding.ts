import { supabase } from '@/lib/supabase'

export interface OutstandingRow {
  id: string
  student_id: string
  student_name: string
  student_number: string
  class_name: string
  class_id: string
  collection_type_id: string
  collection_type: string
  expected_amount: number
  amount_paid: number
  balance: number
  status: string
}

export async function fetchOutstandingPayments(termId: string): Promise<OutstandingRow[]> {
  const { data, error } = await supabase
    .from('student_obligations')
    .select(
      'id, expected_amount, amount_paid, balance, status, collection_type_id, ' +
        'collection_types:collection_type_id(name), ' +
        'students:student_id(id, full_name, student_number, class_id, classes:class_id(class_name))',
    )
    .eq('term_id', termId)
    .gt('balance', 0)
    .order('balance', { ascending: false })

  if (error) throw error

  interface RawRow {
    id: string
    expected_amount: number
    amount_paid: number
    balance: number
    status: string
    collection_type_id: string
    collection_types: { name: string } | null
    students: {
      id: string
      full_name: string
      student_number: string
      class_id: string
      classes: { class_name: string } | null
    } | null
  }

  return ((data ?? []) as unknown as RawRow[]).map((row) => {
    const student = row.students as unknown as {
      id: string
      full_name: string
      student_number: string
      class_id: string
      classes: { class_name: string } | null
    } | null
    return {
      id: row.id,
      student_id: student?.id ?? '',
      student_name: student?.full_name ?? '—',
      student_number: student?.student_number ?? '—',
      class_id: student?.class_id ?? '',
      class_name: student?.classes?.class_name ?? '—',
      collection_type_id: row.collection_type_id,
      collection_type: (row.collection_types as unknown as { name: string } | null)?.name ?? '—',
      expected_amount: Number(row.expected_amount),
      amount_paid: Number(row.amount_paid),
      balance: Number(row.balance),
      status: row.status,
    }
  })
}
