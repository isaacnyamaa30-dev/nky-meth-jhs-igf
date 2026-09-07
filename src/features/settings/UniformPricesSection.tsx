import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast, friendlyError } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageLoader } from '@/components/ui/spinner'
import { listUniformItems, updateUniformItemPrice } from '@/services/uniformItems'

function PriceRow({ id, name, initial, onSaved }: { id: string; name: string; initial: number; onSaved: () => void }) {
  const toast = useToast()
  const [value, setValue] = React.useState(String(initial))
  const [saving, setSaving] = React.useState(false)
  const dirty = value !== String(initial)

  async function save() {
    const num = Number(value)
    if (!value || Number.isNaN(num) || num <= 0) {
      toast.error('Enter a valid price greater than zero.')
      return
    }
    setSaving(true)
    try {
      await updateUniformItemPrice(id, num)
      toast.success(`${name} price updated.`)
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
          min="0.01"
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

export function UniformPricesSection() {
  const queryClient = useQueryClient()
  const { data: items, isLoading } = useQuery({ queryKey: ['uniform-items', false], queryFn: () => listUniformItems(false) })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uniform Prices</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PageLoader />
        ) : (
          <div>
            {items?.map((i) => (
              <PriceRow
                key={i.id}
                id={i.id}
                name={`${i.item_name}${i.size ? ` (${i.size})` : ''}`}
                initial={i.unit_price}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['uniform-items'] })}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
