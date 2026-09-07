import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { confirmReceipt } from '@/services/cashHandovers'
import { formatGHS } from '@/lib/currency'
import type { CashHandoverWithNames } from '@/services/cashHandovers'

export function ConfirmReceiptDialog({
  handover,
  onOpenChange,
}: {
  handover: CashHandoverWithNames | null
  onOpenChange: (open: boolean) => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { staff } = useAuth()
  const [amount, setAmount] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (handover) setAmount(String(handover.declared_amount))
  }, [handover])

  async function handleConfirm() {
    if (!handover || !staff) return
    const value = Number(amount)
    if (!value || value <= 0) {
      toast.error('Enter the amount actually received.')
      return
    }
    setSubmitting(true)
    try {
      await confirmReceipt(handover.id, staff.id, value)
      toast.success('Receipt confirmed.')
      queryClient.invalidateQueries({ queryKey: ['cash-handovers'] })
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={!!handover}
      onOpenChange={onOpenChange}
      title="Confirm Amount Received"
      description={handover ? `From ${handover.teacher?.full_name}` : undefined}
    >
      {handover && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted">Calculated (system)</p>
              <p className="font-medium text-foreground">{formatGHS(handover.calculated_collection_amount)}</p>
            </div>
            <div>
              <p className="text-muted">Declared (teacher)</p>
              <p className="font-medium text-foreground">{formatGHS(handover.declared_amount)}</p>
            </div>
          </div>
          <div>
            <Label htmlFor="received_amount">Amount actually received (GH₵)</Label>
            <Input
              id="received_amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Saving…' : 'Confirm Received'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
