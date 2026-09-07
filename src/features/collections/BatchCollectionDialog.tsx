import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { listCollectionTypes } from '@/services/collectionTypes'
import { listActiveClasses } from '@/services/classes'
import { listStudents } from '@/services/students'
import { createBatchTransactions, type SingleTransactionInput } from '@/services/transactions'
import { formatGHS } from '@/lib/currency'

export function BatchCollectionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { staff } = useAuth()

  const [classId, setClassId] = React.useState('')
  const [collectionTypeId, setCollectionTypeId] = React.useState('')
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = React.useState('')
  const [paymentMethod, setPaymentMethod] = React.useState<'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Other'>('Cash')
  const [checked, setChecked] = React.useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = React.useState(false)

  const { data: collectionTypes } = useQuery({
    queryKey: ['collection-types', true],
    queryFn: () => listCollectionTypes(true),
    enabled: open,
  })
  const { data: classes } = useQuery({ queryKey: ['active-classes'], queryFn: listActiveClasses, enabled: open })
  const { data: students } = useQuery({ queryKey: ['students'], queryFn: listStudents, enabled: open })

  const classStudents = React.useMemo(
    () => (students ?? []).filter((s) => s.class_id === classId && s.admission_status === 'Active'),
    [students, classId],
  )

  React.useEffect(() => {
    if (!open) {
      setClassId('')
      setCollectionTypeId('')
      setDate(new Date().toISOString().slice(0, 10))
      setAmount('')
      setPaymentMethod('Cash')
      setChecked({})
    }
  }, [open])

  React.useEffect(() => {
    // Default every student in the class to checked whenever the class changes.
    const next: Record<string, boolean> = {}
    classStudents.forEach((s) => {
      next[s.id] = true
    })
    setChecked(next)
  }, [classStudents])

  React.useEffect(() => {
    const type = collectionTypes?.find((c) => c.id === collectionTypeId)
    if (type?.default_amount != null) setAmount(String(type.default_amount))
  }, [collectionTypeId, collectionTypes])

  const selectedCount = Object.values(checked).filter(Boolean).length
  const total = selectedCount * (Number(amount) || 0)

  function toggleAll(value: boolean) {
    const next: Record<string, boolean> = {}
    classStudents.forEach((s) => {
      next[s.id] = value
    })
    setChecked(next)
  }

  async function handleSubmit() {
    if (!staff) {
      toast.error('Your account is not linked to a staff record. Ask an administrator to link it before recording collections.')
      return
    }
    if (!classId || !collectionTypeId) {
      toast.error('Select a class and a collection category first.')
      return
    }
    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) {
      toast.error('Enter an amount greater than zero.')
      return
    }
    const selectedStudents = classStudents.filter((s) => checked[s.id])
    if (selectedStudents.length === 0) {
      toast.error('Select at least one student.')
      return
    }

    setSubmitting(true)
    try {
      const rows: SingleTransactionInput[] = selectedStudents.map((s) => ({
        transaction_date: date,
        collection_type_id: collectionTypeId,
        student_id: s.id,
        class_id: classId,
        staff_id: staff.id,
        quantity: null,
        unit_amount: null,
        amount: amountNum,
        payment_method: paymentMethod,
        payment_reference: null,
        notes: null,
      }))
      await createBatchTransactions(rows)
      toast.success(`Recorded ${rows.length} collections totaling ${formatGHS(total)}.`)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Batch Collection Entry"
      description="Record the same collection for many students in a class at once."
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="batch-class">Class</Label>
            <Select id="batch-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select class</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="batch-type">Collection category</Label>
            <Select id="batch-type" value={collectionTypeId} onChange={(e) => setCollectionTypeId(e.target.value)}>
              <option value="">Select category</option>
              {collectionTypes
                ?.filter((c) => c.student_specific)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="batch-date">Date</Label>
            <Input id="batch-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="batch-amount">Amount per student (GH₵)</Label>
            <Input id="batch-amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="batch-payment">Payment method</Label>
            <Select id="batch-payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
              <option value="Cash">Cash</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </Select>
          </div>
        </div>

        {classId ? (
          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-brand-50/60 px-3 py-2">
              <div className="flex gap-3">
                <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => toggleAll(true)}>
                  Select all
                </button>
                <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => toggleAll(false)}>
                  Deselect all
                </button>
              </div>
              <span className="text-xs text-muted">{selectedCount} of {classStudents.length} selected</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {classStudents.map((s) => (
                <label key={s.id} className="flex items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-brand-50/40">
                  <input
                    type="checkbox"
                    checked={!!checked[s.id]}
                    onChange={(e) => setChecked((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="flex-1">{s.full_name}</span>
                  <span className="text-muted">{s.student_number}</span>
                </label>
              ))}
              {classStudents.length === 0 && <p className="p-3 text-sm text-muted">No active students in this class.</p>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Select a class to list its students.</p>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-foreground">Total: {formatGHS(total)}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 sm:flex-none">
              {submitting ? 'Saving…' : `Save Batch (${selectedCount})`}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
