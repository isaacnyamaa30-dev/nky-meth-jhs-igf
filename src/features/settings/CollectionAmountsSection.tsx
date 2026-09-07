import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast, friendlyError } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageLoader } from '@/components/ui/spinner'
import { listCollectionTypes, updateCollectionTypeAmount } from '@/services/collectionTypes'

function AmountRow({ id, name, initial, onSaved }: { id: string; name: string; initial: number | null; onSaved: () => void }) {
  const toast = useToast()
  const [value, setValue] = React.useState(initial != null ? String(initial) : '')
  const [saving, setSaving] = React.useState(false)
  const dirty = value !== (initial != null ? String(initial) : '')

  async function save() {
    const num = Number(value)
    if (!value || Number.isNaN(num) || num < 0) {
      toast.error('Enter a valid non-negative amount.')
      return
    }
    setSaving(true)
    try {
      await updateCollectionTypeAmount(id, num)
      toast.success(`${name} default amount updated.`)
      onSaved()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-sm text-foreground">{name}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-28"
        />
        <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={save}>
          {saving ? '…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export function CollectionAmountsSection() {
  const queryClient = useQueryClient()
  const { data: types, isLoading } = useQuery({ queryKey: ['collection-types', false], queryFn: () => listCollectionTypes(false) })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Levy Amounts</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PageLoader />
        ) : (
          <div>
            {types
              ?.filter((t) => t.default_amount != null || t.student_specific)
              .map((t) => (
                <AmountRow
                  key={t.id}
                  id={t.id}
                  name={t.name}
                  initial={t.default_amount}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ['collection-types'] })}
                />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
