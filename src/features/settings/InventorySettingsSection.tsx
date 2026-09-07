import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast, friendlyError } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/spinner'
import { useAuth } from '@/features/auth/AuthProvider'
import { getSetting, updateSetting, type InventorySettings } from '@/services/settings'

export function InventorySettingsSection() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['setting', 'inventory'],
    queryFn: () => getSetting<InventorySettings>('inventory'),
  })

  async function toggle(next: boolean) {
    if (!user) return
    try {
      await updateSetting('inventory', { allow_negative_stock: next }, user.id)
      toast.success(next ? 'Uniform sales can now go below zero stock.' : 'Uniform sales are now blocked once stock reaches zero.')
      queryClient.invalidateQueries({ queryKey: ['setting', 'inventory'] })
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PageLoader />
        ) : (
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={settings?.allow_negative_stock ?? false}
              onChange={(e) => toggle(e.target.checked)}
            />
            Allow uniform sales to exceed available stock
          </label>
        )}
      </CardContent>
    </Card>
  )
}
