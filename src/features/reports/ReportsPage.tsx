import * as React from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DailyReportSection } from './DailyReportSection'
import { TermReportSection } from './TermReportSection'
import { StaffReportSection } from './StaffReportSection'
import { StudentStatementSection } from './StudentStatementSection'

const TABS = [
  { key: 'daily', label: 'Daily' },
  { key: 'term', label: 'Weekly / 14-Week Term' },
  { key: 'staff', label: 'Staff Collection' },
  { key: 'student', label: 'Student Statement' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function ReportsPage() {
  const [tab, setTab] = React.useState<TabKey>('daily')

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-gradient-navy">Reports</h1>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer size={16} /> Print
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-brand-900 text-white' : 'text-muted hover:bg-brand-50',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' && <DailyReportSection />}
      {tab === 'term' && <TermReportSection />}
      {tab === 'staff' && <StaffReportSection />}
      {tab === 'student' && <StudentStatementSection />}
    </div>
  )
}
