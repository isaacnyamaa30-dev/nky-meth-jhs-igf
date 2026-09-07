import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDailyReport } from '@/services/reports'
import { Card, StatCard } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { formatGHS } from '@/lib/currency'

export function DailyReportSection() {
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10))
  const { data, isLoading } = useQuery({ queryKey: ['daily-report', date], queryFn: () => fetchDailyReport(date) })

  const total = (data?.rows ?? []).reduce((sum, r) => sum + r.amount, 0)
  const count = (data?.rows ?? []).reduce((sum, r) => sum + r.transaction_count, 0)

  return (
    <div className="space-y-4">
      <div className="w-48">
        <Label htmlFor="daily-date">Date</Label>
        <Input id="daily-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total Collected" value={formatGHS(total)} accent="brand" />
            <StatCard label="Transactions" value={count} accent="muted" />
            <StatCard label="Categories" value={data?.rows.length ?? 0} accent="muted" />
          </div>

          <TableContainer>
            <Thead>
              <tr>
                <Th>Category</Th>
                <Th># Transactions</Th>
                <Th>Amount</Th>
              </tr>
            </Thead>
            <tbody>
              {(data?.rows ?? []).length === 0 && <EmptyState message="No collections recorded on this date." />}
              {data?.rows.map((r) => (
                <Tr key={r.category}>
                  <Td className="font-medium text-foreground">{r.category}</Td>
                  <Td>{r.transaction_count}</Td>
                  <Td>{formatGHS(r.amount)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableContainer>

          <Card>
            <TableContainer className="rounded-none border-0">
              <Thead>
                <tr>
                  <Th>Receipt / Txn #</Th>
                  <Th>Category</Th>
                  <Th>Collector</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {(data?.details ?? []).length === 0 && <EmptyState message="No individual transactions on this date." />}
                {data?.details.map((d) => (
                  <Tr key={d.id}>
                    <Td>{d.transaction_number}</Td>
                    <Td>{d.category}</Td>
                    <Td>{d.collector}</Td>
                    <Td>{formatGHS(d.amount)}</Td>
                    <Td>
                      <StatusBadge status={d.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableContainer>
          </Card>
        </>
      )}
    </div>
  )
}
