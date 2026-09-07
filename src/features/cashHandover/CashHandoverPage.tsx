import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast, friendlyError } from '@/components/ui/toast'
import { formatGHS } from '@/lib/currency'
import { listCashHandovers, resolveDiscrepancy, type CashHandoverWithNames } from '@/services/cashHandovers'
import { SubmitHandoverDialog } from './SubmitHandoverDialog'
import { ConfirmReceiptDialog } from './ConfirmReceiptDialog'

export function CashHandoverPage() {
  const { role, user } = useAuth()
  const isBackOffice = role === 'admin' || role === 'accounts'
  const toast = useToast()
  const queryClient = useQueryClient()

  const [submitOpen, setSubmitOpen] = React.useState(false)
  const [receiptTarget, setReceiptTarget] = React.useState<CashHandoverWithNames | null>(null)
  const [resolveTarget, setResolveTarget] = React.useState<CashHandoverWithNames | null>(null)
  const [resolveNote, setResolveNote] = React.useState('')
  const [resolving, setResolving] = React.useState(false)

  const { data: handovers, isLoading } = useQuery({ queryKey: ['cash-handovers'], queryFn: listCashHandovers })

  async function handleResolve() {
    if (!resolveTarget || !user) return
    setResolving(true)
    try {
      await resolveDiscrepancy(resolveTarget, user.id, resolveNote)
      toast.success('Discrepancy resolved.')
      queryClient.invalidateQueries({ queryKey: ['cash-handovers'] })
      setResolveTarget(null)
      setResolveNote('')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-foreground">Cash Handover</h1>
        <Button onClick={() => setSubmitOpen(true)}>
          <Plus size={16} /> Submit Handover
        </Button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <TableContainer>
          <Thead>
            <tr>
              <Th>Teacher</Th>
              <Th>Period</Th>
              <Th>Calculated</Th>
              <Th>Declared</Th>
              <Th>Received</Th>
              <Th>Difference</Th>
              <Th>Status</Th>
              {isBackOffice && <Th>Actions</Th>}
            </tr>
          </Thead>
          <tbody>
            {(handovers ?? []).length === 0 && <EmptyState message="No cash handovers yet." />}
            {handovers?.map((h) => (
              <Tr key={h.id}>
                <Td className="font-medium text-foreground">{h.teacher?.full_name ?? '—'}</Td>
                <Td>
                  {h.start_period} – {h.end_period}
                </Td>
                <Td>{formatGHS(h.calculated_collection_amount)}</Td>
                <Td>{formatGHS(h.declared_amount)}</Td>
                <Td>{h.received_amount != null ? formatGHS(h.received_amount) : '—'}</Td>
                <Td className={h.difference !== 0 ? 'font-medium text-danger' : ''}>{formatGHS(h.difference)}</Td>
                <Td>
                  <StatusBadge status={h.status} />
                </Td>
                {isBackOffice && (
                  <Td>
                    <div className="flex gap-2">
                      {h.status === 'Submitted' && (
                        <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setReceiptTarget(h)}>
                          Confirm Receipt
                        </button>
                      )}
                      {h.status === 'Discrepancy' && (
                        <button className="text-sm font-medium text-danger hover:underline" onClick={() => setResolveTarget(h)}>
                          Resolve
                        </button>
                      )}
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </TableContainer>
      )}

      <SubmitHandoverDialog open={submitOpen} onOpenChange={setSubmitOpen} />
      <ConfirmReceiptDialog handover={receiptTarget} onOpenChange={(o) => !o && setReceiptTarget(null)} />

      <ConfirmDialog
        open={!!resolveTarget}
        onOpenChange={(o) => {
          if (!o) {
            setResolveTarget(null)
            setResolveNote('')
          }
        }}
        title="Resolve discrepancy?"
        description={
          resolveTarget
            ? `Expected ${formatGHS(resolveTarget.calculated_collection_amount)}, received ${formatGHS(resolveTarget.received_amount ?? 0)} (difference ${formatGHS(resolveTarget.difference)}). Explain how this was resolved.`
            : ''
        }
        confirmLabel="Mark Resolved"
        requireReason
        reason={resolveNote}
        onReasonChange={setResolveNote}
        onConfirm={handleResolve}
        submitting={resolving}
      />
    </div>
  )
}
