import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getActiveContext } from '@/services/reference'
import {
  fetchCategoryBreakdown,
  fetchDashboardSummary,
  fetchPaymentStatusBreakdown,
  fetchWeeklyTrend,
} from '@/services/dashboard'
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/spinner'
import { formatGHS } from '@/lib/currency'

const CATEGORY_COLORS = ['#0f5132', '#2c7f57', '#71b892', '#d19412', '#e8ae2b', '#5b6b62']
const STATUS_COLORS: Record<string, string> = {
  Paid: '#1f7a44',
  Partial: '#b5820c',
  Outstanding: '#b3261e',
  Waived: '#0f5132',
}

export function DashboardPage() {
  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ['active-context'],
    queryFn: getActiveContext,
  })

  const termId = context?.term?.id

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary', termId],
    queryFn: () => fetchDashboardSummary(termId!),
    enabled: !!termId,
  })

  const { data: trend } = useQuery({
    queryKey: ['weekly-trend', termId],
    queryFn: () => fetchWeeklyTrend(termId!),
    enabled: !!termId,
  })

  const { data: categories } = useQuery({
    queryKey: ['category-breakdown', termId],
    queryFn: () => fetchCategoryBreakdown(termId!),
    enabled: !!termId,
  })

  const { data: paymentStatus } = useQuery({
    queryKey: ['payment-status', termId],
    queryFn: () => fetchPaymentStatusBreakdown(termId!),
    enabled: !!termId,
  })

  if (contextLoading) return <PageLoader />

  if (!context?.term) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted">
          No active term is configured yet. Ask an administrator to create the current academic year and term under{' '}
          <span className="font-medium text-foreground">Terms</span>.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted">
            {context.term.term_name} — {context.term.number_of_weeks} weeks
            {context.week ? ` · Week ${context.week.week_number} of ${context.term.number_of_weeks}` : ''}
          </p>
        </div>
      </div>

      {summaryLoading || !summary ? (
        <PageLoader />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total IGF Collected" value={formatGHS(summary.total_collected)} accent="brand" />
            <StatCard label="Today's Collection" value={formatGHS(summary.today_collected)} />
            <StatCard label="This Week" value={formatGHS(summary.week_collected)} />
            <StatCard label="This Term" value={formatGHS(summary.term_collected)} />
            <StatCard label="PTA Levy" value={formatGHS(summary.pta_total)} accent="muted" />
            <StatCard label="Morning Classes" value={formatGHS(summary.morning_total)} accent="muted" />
            <StatCard label="Sports Levy" value={formatGHS(summary.sports_total)} accent="muted" />
            <StatCard label="Worship Offering" value={formatGHS(summary.worship_total)} accent="muted" />
            <StatCard label="Uniform Sales" value={formatGHS(summary.uniform_total)} accent="muted" />
            <StatCard label="Other Collections" value={formatGHS(summary.other_total)} accent="muted" />
            <StatCard label="Outstanding Levies" value={formatGHS(summary.outstanding_levies)} accent="gold" />
            <StatCard label="Awaiting Handover" value={formatGHS(summary.awaiting_handover)} accent="gold" />
            <StatCard label="Reconciled Amount" value={formatGHS(summary.reconciled_amount)} accent="brand" />
            <StatCard label="Transactions" value={summary.transaction_count} accent="muted" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Collection Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e4" vertical={false} />
                    <XAxis dataKey="week_number" tickFormatter={(v) => `W${v}`} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `GH₵${v}`} width={70} />
                    <Tooltip formatter={(v) => formatGHS(v as number)} labelFormatter={(v) => `Week ${v}`} />
                    <Bar dataKey="total" fill="#0f5132" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collection Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(categories ?? []).filter((c) => c.total > 0)}
                      dataKey="total"
                      nameKey="category"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {(categories ?? []).map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatGHS(v as number)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Payment Status (student levies)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentStatus ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e4" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `GH₵${v}`} />
                    <YAxis dataKey="status" type="category" tick={{ fontSize: 12 }} width={90} />
                    <Tooltip formatter={(v) => formatGHS(v as number)} />
                    <Bar dataKey="total_balance" radius={[0, 4, 4, 0]}>
                      {(paymentStatus ?? []).map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] ?? '#5b6b62'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
