import { useQuery } from '@tanstack/react-query'
import { getActiveContext } from '@/services/reference'
import { fetchStaffCollectionReport } from '@/services/reports'
import { Card } from '@/components/ui/card'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { formatGHS } from '@/lib/currency'

export function StaffReportSection() {
  const { data: context } = useQuery({ queryKey: ['active-context'], queryFn: getActiveContext })
  const termId = context?.term?.id

  const { data: rows, isLoading } = useQuery({
    queryKey: ['staff-report', termId],
    queryFn: () => fetchStaffCollectionReport(termId!),
    enabled: !!termId,
  })

  if (!context?.term) {
    return <Card className="p-8 text-center text-sm text-muted">No active term configured yet.</Card>
  }

  if (isLoading) return <PageLoader />

  return (
    <TableContainer>
      <Thead>
        <tr>
          <Th>Staff</Th>
          <Th># Transactions</Th>
          <Th>Total Collected</Th>
          <Th>Handed Over</Th>
          <Th>Outstanding Handover</Th>
        </tr>
      </Thead>
      <tbody>
        {(rows ?? []).length === 0 && <EmptyState message="No collections recorded by any staff member yet." />}
        {rows?.map((r) => (
          <Tr key={r.staff_id}>
            <Td className="font-medium text-foreground">{r.staff_name}</Td>
            <Td>{r.transaction_count}</Td>
            <Td>{formatGHS(r.total_collected)}</Td>
            <Td>{formatGHS(r.handed_over)}</Td>
            <Td className={r.outstanding_handover > 0 ? 'font-medium text-gold-700' : ''}>
              {formatGHS(r.outstanding_handover)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableContainer>
  )
}
