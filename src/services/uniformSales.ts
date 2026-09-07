import { supabase } from '@/lib/supabase'
import type { PaymentMethod, UniformSale } from '@/types/domain'

export interface UniformSaleWithDetails extends UniformSale {
  uniform_items: { item_name: string; size: string | null } | null
  students: { full_name: string; student_number: string } | null
  staff: { full_name: string } | null
}

export async function listUniformSales(limit = 100): Promise<UniformSaleWithDetails[]> {
  const { data, error } = await supabase
    .from('uniform_sales')
    .select('*, uniform_items:item_id(item_name, size), students:student_id(full_name, student_number), staff:sold_by(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as unknown as UniformSaleWithDetails[]
}

export interface UniformSaleInput {
  student_id: string | null
  item_id: string
  quantity: number
  unit_price: number
  payment_status: 'Paid' | 'Partial' | 'Outstanding'
  payment_method: PaymentMethod
  sold_by: string
  sale_date: string
}

/**
 * Records a uniform sale as a School Uniform transaction (so it flows
 * through the same authoritative ledger as every other collection) plus the
 * linked uniform_sales row that the stock-decrement trigger acts on.
 */
export async function createUniformSale(input: UniformSaleInput) {
  const { data: collectionType, error: ctError } = await supabase
    .from('collection_types')
    .select('id')
    .eq('name', 'School Uniform')
    .single()
  if (ctError) throw ctError

  const amount = input.quantity * input.unit_price

  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      transaction_date: input.sale_date,
      collection_type_id: collectionType.id,
      student_id: input.student_id,
      staff_id: input.sold_by,
      quantity: input.quantity,
      unit_amount: input.unit_price,
      amount,
      payment_method: input.payment_method,
    })
    .select('id')
    .single()
  if (txError) throw txError

  const { error: saleError } = await supabase.from('uniform_sales').insert({
    student_id: input.student_id,
    item_id: input.item_id,
    quantity: input.quantity,
    unit_price: input.unit_price,
    payment_status: input.payment_status,
    payment_method: input.payment_method,
    sold_by: input.sold_by,
    transaction_id: transaction.id,
    sale_date: input.sale_date,
  })
  if (saleError) throw saleError
}
