import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Users } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Select } from '@/components/ui/input'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast, friendlyError } from '@/components/ui/toast'
import { formatGHS } from '@/lib/currency'
import { listRecentTransactions, voidTransaction, type TransactionWithDetails } from '@/services/transactions'
import { listCollectionTypes } from '@/services/collectionTypes'
import { RecordCollectionDialog } from './RecordCollectionDialog'
import { BatchCollectionDialog } from './BatchCollectionDialog'
import { CollectionTypeFormDialog } from './CollectionTypeFormDialog'

export function CollectionsPage() {
  const { role, staff } = useAuth()
  const canVoid = role === 'admin' || role === 'accounts'
  const isAdmin = role === 'admin'

  const [recordOpen, setRecordOpen] = React.useState(false)
  const [batchOpen, setBatchOpen] = React.useState(false)
  const [typeFormOpen, setTypeFormOpen] = React.useState(false)
  const [categoryFilter, setCategoryFilter] = React.useState('')
  const [voidTarget, setVoidTarget] = React.useState<TransactionWithDetails | null>(null)
  const [voidReason, setVoidReason] = React.useState('')
  const [voiding, setVoiding] = React.useState(false)

  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: transactions, isLoading } = useQuery({ queryKey: ['transactions'], queryFn: () => listRecentTransactions(150) })
  const { data: collectionTypes } = useQuery({ queryKey: ['collection-types', false], queryFn: () => listCollectionTypes(false) })

  const filtered = (transactions ?? []).filter((t) => !categoryFilter || t.collection_type_id === categoryFilter)

  async function handleVoid() {
    if (!voidTarget) return
    setVoiding(true)
    try {
      await voidTransaction(voidTarget.id, voidReason)
      toast.success(`${voidTarget.transaction_number} voided.`)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setVoidTarget(null)
      setVoidReason('')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setVoiding(false)
    }
  }

  if (!staff) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Your login isn't linked to a staff record yet, so you can't record collections. Ask an administrator to link
        your account under Staff.
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-foreground">Collections</h1>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setTypeFormOpen(true)}>
              <Plus size={16} /> Add Collection Type
            </Button>
          )}
          <Button variant="outline" onClick={() => setBatchOpen(true)}>
            <Users size={16} /> Batch Entry
          </Button>
          <Button onClick={() => setRecordOpen(true)}>
            <Plus size={16} /> Record Collection
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="sm:w-64">
          <option value="">All categories</option>
          {collectionTypes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : (
        <TableContainer>
          <Thead>
            <tr>
              <Th>Date</Th>
              <Th>Receipt #</Th>
              <Th>Category</Th>
              <Th>Student / Class</Th>
              <Th>Collector</Th>
              <Th>Amount</Th>
              <Th>Method</Th>
              <Th>Status</Th>
              {canVoid && <Th>Actions</Th>}
            </tr>
          </Thead>
          <tbody>
            {filtered.length === 0 && <EmptyState message="No collections recorded yet." />}
            {filtered.map((t) => (
              <Tr key={t.id}>
                <Td>{t.transaction_date}</Td>
                <Td className="font-medium text-foreground">{t.receipt_number ?? '—'}</Td>
                <Td>{t.collection_types?.name ?? '—'}</Td>
                <Td>{t.students?.full_name ?? t.classes?.class_name ?? '—'}</Td>
                <Td>{t.staff?.full_name ?? '—'}</Td>
                <Td className="font-medium text-foreground">{formatGHS(t.amount)}</Td>
                <Td>{t.payment_method}</Td>
                <Td>
                  <StatusBadge status={t.status} />
                </Td>
                {canVoid && (
                  <Td>
                    {t.status !== 'Voided' && (
                      <button className="text-sm font-medium text-danger hover:underline" onClick={() => setVoidTarget(t)}>
                        Void
                      </button>
                    )}
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </TableContainer>
      )}

      <RecordCollectionDialog open={recordOpen} onOpenChange={setRecordOpen} />
      <BatchCollectionDialog open={batchOpen} onOpenChange={setBatchOpen} />
      {isAdmin && <CollectionTypeFormDialog open={typeFormOpen} onOpenChange={setTypeFormOpen} />}

      <ConfirmDialog
        open={!!voidTarget}
        onOpenChange={(o) => {
          if (!o) {
            setVoidTarget(null)
            setVoidReason('')
          }
        }}
        title={`Void ${voidTarget?.transaction_number}?`}
        description={`This removes ${voidTarget ? formatGHS(voidTarget.amount) : ''} from all totals and reports, but keeps it visible in the audit history. This cannot be undone.`}
        confirmLabel="Void Transaction"
        variant="danger"
        requireReason
        reason={voidReason}
        onReasonChange={setVoidReason}
        onConfirm={handleVoid}
        submitting={voiding}
      />
    </div>
  )
}
