import { useQuery } from '@tanstack/react-query'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { getActiveContext } from '@/services/reference'
import { fetchTermReport } from '@/services/reports'
import { Card, CardContent } from '@/components/ui/card'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { formatGHS } from '@/lib/currency'
import { cn } from '@/lib/utils'

function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null // undefined growth when there's no baseline
  return ((current - previous) / previous) * 100
}

export function TermReportSection() {
  const { data: context } = useQuery({ queryKey: ['active-context'], queryFn: getActiveContext })
  const termId = context?.term?.id

  const { data: rows, isLoading } = useQuery({
    queryKey: ['term-report', termId],
    queryFn: () => fetchTermReport(termId!),
    enabled: !!termId,
  })

  if (!context?.term) {
    return <Card className="p-8 text-center text-sm text-muted">No active term configured yet.</Card>
  }

  if (isLoading || !rows) return <PageLoader />

  const totals = rows.reduce(
    (acc, r) => ({
      pta: acc.pta + r.pta,
      morning: acc.morning + r.morning,
      sports: acc.sports + r.sports,
      worship: acc.worship + r.worship,
      uniform: acc.uniform + r.uniform,
      other: acc.other + r.other,
      total: acc.total + r.total,
    }),
    { pta: 0, morning: 0, sports: 0, worship: 0, uniform: 0, other: 0, total: 0 },
  )

  const currentWeekNumber = context.week?.week_number
  const currentWeek = rows.find((r) => r.week_number === currentWeekNumber)
  const previousWeek = currentWeekNumber ? rows.find((r) => r.week_number === currentWeekNumber - 1) : undefined
  const growth = currentWeek && previousWeek ? growthPercent(currentWeek.total, previousWeek.total) : null

  return (
    <div className="space-y-4">
      {currentWeek && (
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Week {currentWeek.week_number} vs Week {(previousWeek?.week_number ?? currentWeek.week_number - 1) || '—'}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-2xl font-semibold text-brand-800">{formatGHS(currentWeek.total)}</p>
            {previousWeek && growth !== null && (
              <span
                className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  growth >= 0 ? 'text-success' : 'text-danger',
                )}
              >
                {growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {growth.toFixed(1)}% vs last week ({formatGHS(previousWeek.total)})
              </span>
            )}
            {previousWeek && growth === null && (
              <span className="text-sm text-muted">No prior-week baseline to compare.</span>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <TableContainer className="rounded-none border-0">
            <Thead>
              <tr>
                <Th>Week</Th>
                <Th>PTA</Th>
                <Th>Morning</Th>
                <Th>Sports</Th>
                <Th>Worship</Th>
                <Th>Uniform</Th>
                <Th>Other</Th>
                <Th>Total</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.length === 0 && <EmptyState message="No weeks generated for this term." />}
              {rows.map((r) => (
                <Tr key={r.week_number} className={r.week_number === currentWeekNumber ? 'bg-brand-50/60' : ''}>
                  <Td className="font-medium text-foreground">Week {r.week_number}</Td>
                  <Td>{formatGHS(r.pta)}</Td>
                  <Td>{formatGHS(r.morning)}</Td>
                  <Td>{formatGHS(r.sports)}</Td>
                  <Td>{formatGHS(r.worship)}</Td>
                  <Td>{formatGHS(r.uniform)}</Td>
                  <Td>{formatGHS(r.other)}</Td>
                  <Td className="font-medium text-foreground">{formatGHS(r.total)}</Td>
                </Tr>
              ))}
              {rows.length > 0 && (
                <Tr className="bg-brand-50 font-semibold text-foreground">
                  <Td>Total</Td>
                  <Td>{formatGHS(totals.pta)}</Td>
                  <Td>{formatGHS(totals.morning)}</Td>
                  <Td>{formatGHS(totals.sports)}</Td>
                  <Td>{formatGHS(totals.worship)}</Td>
                  <Td>{formatGHS(totals.uniform)}</Td>
                  <Td>{formatGHS(totals.other)}</Td>
                  <Td>{formatGHS(totals.total)}</Td>
                </Tr>
              )}
            </tbody>
          </TableContainer>
        </CardContent>
      </Card>
    </div>
  )
}
