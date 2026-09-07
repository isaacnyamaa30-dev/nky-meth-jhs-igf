import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getActiveContext } from '@/services/reference'
import { fetchOutstandingPayments } from '@/services/outstanding'
import { listClasses } from '@/services/classes'
import { listCollectionTypes } from '@/services/collectionTypes'
import { Card, StatCard } from '@/components/ui/card'
import { Select, Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { formatGHS } from '@/lib/currency'

export function OutstandingPaymentsPage() {
  const [classFilter, setClassFilter] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState('')
  const [search, setSearch] = React.useState('')

  const { data: context } = useQuery({ queryKey: ['active-context'], queryFn: getActiveContext })
  const termId = context?.term?.id

  const { data: rows, isLoading } = useQuery({
    queryKey: ['outstanding', termId],
    queryFn: () => fetchOutstandingPayments(termId!),
    enabled: !!termId,
  })
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: listClasses })
  const { data: collectionTypes } = useQuery({ queryKey: ['collection-types', false], queryFn: () => listCollectionTypes(false) })

  const filtered = (rows ?? []).filter((r) => {
    const q = search.toLowerCase()
    return (
      (!classFilter || r.class_id === classFilter) &&
      (!typeFilter || r.collection_type_id === typeFilter) &&
      (r.student_name.toLowerCase().includes(q) || r.student_number.toLowerCase().includes(q))
    )
  })

  const totalOutstanding = filtered.reduce((sum, r) => sum + r.balance, 0)

  if (!context?.term) {
    return <Card className="p-8 text-center text-sm text-muted">No active term configured yet.</Card>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gradient-navy">Outstanding Payments</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Outstanding" value={formatGHS(totalOutstanding)} accent="gold" />
        <StatCard label="Students Affected" value={new Set(filtered.map((r) => r.student_id)).size} accent="muted" />
        <StatCard label="Obligations" value={filtered.length} accent="muted" />
      </div>

      <Card className="flex flex-col gap-3 p-3 sm:flex-row">
        <Input placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Select className="sm:w-56" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.class_name}
            </option>
          ))}
        </Select>
        <Select className="sm:w-56" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All collection types</option>
          {collectionTypes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : (
        <TableContainer>
          <Thead>
            <tr>
              <Th>Student</Th>
              <Th>Class</Th>
              <Th>Levy</Th>
              <Th>Expected</Th>
              <Th>Paid</Th>
              <Th>Balance</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.length === 0 && <EmptyState message="No outstanding payments — everyone is settled." />}
            {filtered.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-foreground">
                  {r.student_name} <span className="text-muted">({r.student_number})</span>
                </Td>
                <Td>{r.class_name}</Td>
                <Td>{r.collection_type}</Td>
                <Td>{formatGHS(r.expected_amount)}</Td>
                <Td>{formatGHS(r.amount_paid)}</Td>
                <Td className="font-medium text-danger">{formatGHS(r.balance)}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableContainer>
      )}
    </div>
  )
}
