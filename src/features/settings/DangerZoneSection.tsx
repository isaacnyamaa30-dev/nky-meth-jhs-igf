import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { clearSampleData } from '@/services/settings'

const CONFIRM_PHRASE = 'CLEAR SAMPLE DATA'

export function DangerZoneSection() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [confirmText, setConfirmText] = React.useState('')
  const [clearing, setClearing] = React.useState(false)
  const [done, setDone] = React.useState(false)

  async function handleClear() {
    setClearing(true)
    try {
      await clearSampleData()
      toast.success('Sample transactions and financial history cleared. Staff, students and classes were left untouched.')
      setDone(true)
      setConfirmText('')
      queryClient.invalidateQueries()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setClearing(false)
    }
  }

  return (
    <Card className="border-danger/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-danger">
          <AlertTriangle size={16} /> Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Clear sample data before going live</p>
          <p className="mt-1 text-sm text-muted">
            Permanently deletes every sample transaction, receipt, cash handover, reconciliation record and audit
            log entry, and resets uniform stock counts back to their opening levels. This does <strong>not</strong>{' '}
            touch staff, students, classes, collection types, terms or academic years — remove any fictional sample
            staff or students individually from the Staff and Students pages first if you'd like. This cannot be
            undone.
          </p>
        </div>

        {done ? (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            Sample data cleared. The app is ready for real collections.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="confirm-clear">
              Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to confirm
            </Label>
            <Input
              id="confirm-clear"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="max-w-xs"
            />
            <Button
              variant="danger"
              disabled={confirmText !== CONFIRM_PHRASE || clearing}
              onClick={handleClear}
            >
              {clearing ? 'Clearing…' : 'Clear Sample Data'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
