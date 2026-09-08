import { SchoolProfileSection } from './SchoolProfileSection'
import { CollectionAmountsSection } from './CollectionAmountsSection'
import { UniformPricesSection } from './UniformPricesSection'
import { InventorySettingsSection } from './InventorySettingsSection'
import { DangerZoneSection } from './DangerZoneSection'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gradient-navy">Settings</h1>
      <SchoolProfileSection />
      <CollectionAmountsSection />
      <UniformPricesSection />
      <InventorySettingsSection />
      <DangerZoneSection />
    </div>
  )
}
