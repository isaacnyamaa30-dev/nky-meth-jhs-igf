import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { listCollectionTypes } from '@/services/collectionTypes'
import { listActiveClasses } from '@/services/classes'
import { listStudents } from '@/services/students'
import { createTransaction, findPossibleDuplicate } from '@/services/transactions'

const schema = z.object({
  transaction_date: z.string().min(1, 'Date is required'),
  collection_type_id: z.string().min(1, 'Select a collection category'),
  class_id: z.string(),
  student_id: z.string(),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  quantity: z.coerce.number().int().positive().optional().or(z.literal('')),
  payment_method: z.enum(['Cash', 'Mobile Money', 'Bank Transfer', 'Other']),
  payment_reference: z.string(),
  notes: z.string(),
})
type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

export function RecordCollectionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { staff } = useAuth()
  const [duplicateConfirmed, setDuplicateConfirmed] = React.useState(false)
  const [duplicateWarning, setDuplicateWarning] = React.useState(false)

  const { data: collectionTypes } = useQuery({
    queryKey: ['collection-types', true],
    queryFn: () => listCollectionTypes(true),
    enabled: open,
  })
  const { data: classes } = useQuery({ queryKey: ['active-classes'], queryFn: listActiveClasses, enabled: open })
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
      transaction_date: new Date().toISOString().slice(0, 10),
      collection_type_id: '',
      class_id: '',
      student_id: '',
      amount: 0,
      quantity: '',
      payment_method: 'Cash',
      payment_reference: '',
      notes: '',
    },
  })

  React.useEffect(() => {
    if (open) {
      reset()
      setDuplicateConfirmed(false)
      setDuplicateWarning(false)
    }
  }, [open, reset])

  const selectedTypeId = watch('collection_type_id')
  const selectedClassId = watch('class_id')
  const selectedType = collectionTypes?.find((c) => c.id === selectedTypeId)
  const paymentMethod = watch('payment_method')

  React.useEffect(() => {
    if (selectedType?.default_amount != null) {
      setValue('amount', selectedType.default_amount)
    }
  }, [selectedType, setValue])

  const classStudents = (students ?? []).filter((s) => !selectedClassId || s.class_id === selectedClassId)

  async function onSubmit(values: FormOutput) {
    if (!staff) {
      toast.error('Your account is not linked to a staff record. Ask an administrator to link it before recording collections.')
      return
    }

    try {
      if (!duplicateConfirmed && values.student_id) {
        const isDuplicate = await findPossibleDuplicate({
          student_id: values.student_id,
          collection_type_id: values.collection_type_id,
          transaction_date: values.transaction_date,
          amount: values.amount,
        })
        if (isDuplicate) {
          setDuplicateWarning(true)
          return
        }
      }

      await createTransaction({
        transaction_date: values.transaction_date,
        collection_type_id: values.collection_type_id,
        student_id: values.student_id || null,
        class_id: values.class_id || null,
        staff_id: staff.id,
        quantity: values.quantity === '' ? null : Number(values.quantity),
        unit_amount: selectedType?.calculation_method === 'Quantity x unit price' ? selectedType.default_amount : null,
        amount: values.amount,
        payment_method: values.payment_method,
        payment_reference: values.payment_reference || null,
        notes: values.notes || null,
      })
      toast.success('Collection recorded.')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Record Collection">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="transaction_date">Date</Label>
            <Input id="transaction_date" type="date" {...register('transaction_date')} />
            {errors.transaction_date && <p className="mt-1 text-xs text-danger">{errors.transaction_date.message}</p>}
          </div>
          <div>
            <Label htmlFor="collection_type_id">Collection category</Label>
            <Select id="collection_type_id" {...register('collection_type_id')}>
              <option value="">Select category</option>
              {collectionTypes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.collection_type_id && <p className="mt-1 text-xs text-danger">{errors.collection_type_id.message}</p>}
          </div>
        </div>

        {selectedType?.class_specific !== false && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="class_id">Class</Label>
              <Select id="class_id" {...register('class_id')}>
                <option value="">Not class-specific</option>
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name}
                  </option>
                ))}
              </Select>
            </div>
            {selectedType?.student_specific && (
              <div>
                <Label htmlFor="student_id">Student</Label>
                <Select id="student_id" {...register('student_id')}>
                  <option value="">Not student-specific</option>
                  {classStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.student_number})
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="amount">Amount (GH₵)</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" {...register('amount')} />
            {errors.amount && <p className="mt-1 text-xs text-danger">{errors.amount.message}</p>}
          </div>
          {selectedType?.calculation_method === 'Quantity x unit price' && (
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min="1" step="1" {...register('quantity')} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="payment_method">Payment method</Label>
            <Select id="payment_method" {...register('payment_method')}>
              <option value="Cash">Cash</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </Select>
          </div>
          {paymentMethod !== 'Cash' && (
            <div>
              <Label htmlFor="payment_reference">Payment reference</Label>
              <Input id="payment_reference" {...register('payment_reference')} />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={2} {...register('notes')} />
        </div>

        {duplicateWarning && (
          <div className="rounded-lg border border-gold-300 bg-gold-50 p-3 text-sm text-gold-700">
            A similar collection (same student, category, amount and date) was already recorded. Save anyway?
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setDuplicateConfirmed(true)
                  setDuplicateWarning(false)
                  handleSubmit(onSubmit)()
                }}
              >
                Save Anyway
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDuplicateWarning(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || duplicateWarning}>
            {isSubmitting ? 'Saving…' : 'Record Collection'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
