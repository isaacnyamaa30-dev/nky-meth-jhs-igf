import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { listUniformItems } from '@/services/uniformItems'
import { listStudents } from '@/services/students'
import { createUniformSale } from '@/services/uniformSales'
import { formatGHS } from '@/lib/currency'

const schema = z.object({
  sale_date: z.string().min(1, 'Date is required'),
  item_id: z.string().min(1, 'Select an item'),
  student_id: z.string(),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  unit_price: z.coerce.number().positive('Unit price must be greater than zero'),
  payment_status: z.enum(['Paid', 'Partial', 'Outstanding']),
  payment_method: z.enum(['Cash', 'Mobile Money', 'Bank Transfer', 'Other']),
})
type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

export function UniformSaleFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { staff } = useAuth()

  const { data: items } = useQuery({ queryKey: ['uniform-items', true], queryFn: () => listUniformItems(true), enabled: open })
  const { data: students } = useQuery({ queryKey: ['students'], queryFn: listStudents, enabled: open })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      sale_date: new Date().toISOString().slice(0, 10),
      item_id: '',
      student_id: '',
      quantity: 1,
      unit_price: 0,
      payment_status: 'Paid',
      payment_method: 'Cash',
    },
  })

  React.useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const itemId = watch('item_id')
  const quantity = watch('quantity')
  const unitPrice = watch('unit_price')
  const selectedItem = items?.find((i) => i.id === itemId)

  React.useEffect(() => {
    if (selectedItem) setValue('unit_price', selectedItem.unit_price)
  }, [selectedItem, setValue])

  async function onSubmit(values: FormOutput) {
    if (!staff) {
      toast.error('Your account is not linked to a staff record. Ask an administrator to link it.')
      return
    }
    try {
      await createUniformSale({
        student_id: values.student_id || null,
        item_id: values.item_id,
        quantity: values.quantity,
        unit_price: values.unit_price,
        payment_status: values.payment_status,
        payment_method: values.payment_method,
        sold_by: staff.id,
        sale_date: values.sale_date,
      })
      toast.success('Uniform sale recorded.')
      queryClient.invalidateQueries({ queryKey: ['uniform-sales'] })
      queryClient.invalidateQueries({ queryKey: ['uniform-items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Record Uniform Sale">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sale_date">Date</Label>
            <Input id="sale_date" type="date" {...register('sale_date')} />
            {errors.sale_date && <p className="mt-1 text-xs text-danger">{errors.sale_date.message}</p>}
          </div>
          <div>
            <Label htmlFor="item_id">Item</Label>
            <Select id="item_id" {...register('item_id')}>
              <option value="">Select item</option>
              {items?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.item_name} {i.size ? `(${i.size})` : ''} — {i.current_stock} in stock
                </option>
              ))}
            </Select>
            {errors.item_id && <p className="mt-1 text-xs text-danger">{errors.item_id.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="student_id">Student (optional)</Label>
          <Select id="student_id" {...register('student_id')}>
            <option value="">Walk-in / not linked to a student</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.student_number})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" min="1" step="1" {...register('quantity')} />
            {errors.quantity && <p className="mt-1 text-xs text-danger">{errors.quantity.message}</p>}
            {selectedItem && Number(quantity) > selectedItem.current_stock && (
              <p className="mt-1 text-xs text-gold-600">Only {selectedItem.current_stock} left in stock.</p>
            )}
          </div>
          <div>
            <Label htmlFor="unit_price">Unit price (GH₵)</Label>
            <Input id="unit_price" type="number" step="0.01" min="0.01" {...register('unit_price')} />
            {errors.unit_price && <p className="mt-1 text-xs text-danger">{errors.unit_price.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="payment_status">Payment status</Label>
            <Select id="payment_status" {...register('payment_status')}>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Outstanding">Outstanding</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="payment_method">Payment method</Label>
            <Select id="payment_method" {...register('payment_method')}>
              <option value="Cash">Cash</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </Select>
          </div>
        </div>

        <p className="text-sm font-medium text-foreground">
          Total: {formatGHS((Number(quantity) || 0) * (Number(unitPrice) || 0))}
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Record Sale'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
