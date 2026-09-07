import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { listStudents } from '@/services/students'
import { fetchStudentStatement } from '@/services/reports'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { formatGHS } from '@/lib/currency'

export function StudentStatementSection() {
  const [search, setSearch] = React.useState('')
  const [studentId, setStudentId] = React.useState<string | null>(null)

  const { data: students } = useQuery({ queryKey: ['students'], queryFn: listStudents })
  const { data: statement, isLoading } = useQuery({
    queryKey: ['student-statement', studentId],
    queryFn: () => fetchStudentStatement(studentId!),
    enabled: !!studentId,
  })

  const matches =
    search.length > 1
      ? (students ?? [])
          .filter(
            (s) =>
              s.full_name.toLowerCase().includes(search.toLowerCase()) ||
              s.student_number.toLowerCase().includes(search.toLowerCase()),
          )
          .slice(0, 8)
      : []

  const selected = students?.find((s) => s.id === studentId)

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search a student by name or student number…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setStudentId(null)
            }}
          />
        </div>
        {matches.length > 0 && !studentId && (
          <div className="mt-2 divide-y divide-border rounded-lg border border-border">
            {matches.map((s) => (
              <button
                key={s.id}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                onClick={() => {
                  setStudentId(s.id)
                  setSearch(s.full_name)
                }}
              >
                {s.full_name} <span className="text-muted">({s.student_number}) — {s.classes?.class_name}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {studentId && (
        <>
          {isLoading || !statement ? (
            <PageLoader />
          ) : (
            <>
              <Card className="p-4">
                <p className="text-sm font-semibold text-foreground">{selected?.full_name}</p>
                <p className="text-xs text-muted">
                  {selected?.student_number} — {selected?.classes?.class_name}
                </p>
              </Card>

              <Card>
                <TableContainer className="rounded-none border-0">
                  <Thead>
                    <tr>
                      <Th>Levy</Th>
                      <Th>Expected</Th>
                      <Th>Paid</Th>
                      <Th>Waived</Th>
                      <Th>Balance</Th>
                      <Th>Status</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {statement.obligations.length === 0 && <EmptyState message="No termly levies tracked for this student." />}
                    {statement.obligations.map((o) => (
                      <Tr key={o.id}>
                        <Td className="font-medium text-foreground">{o.collection_type}</Td>
                        <Td>{formatGHS(o.expected_amount)}</Td>
                        <Td>{formatGHS(o.amount_paid)}</Td>
                        <Td>{formatGHS(o.waived_amount)}</Td>
                        <Td className={o.balance > 0 ? 'font-medium text-danger' : ''}>{formatGHS(o.balance)}</Td>
                        <Td>
                          <StatusBadge status={o.status} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableContainer>
              </Card>

              <Card>
                <TableContainer className="rounded-none border-0">
                  <Thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Receipt #</Th>
                      <Th>Category</Th>
                      <Th>Amount</Th>
                      <Th>Method</Th>
                      <Th>Status</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {statement.transactions.length === 0 && <EmptyState message="No transaction history yet." />}
                    {statement.transactions.map((t) => (
                      <Tr key={t.id}>
                        <Td>{t.transaction_date}</Td>
                        <Td>{t.receipt_number ?? '—'}</Td>
                        <Td>{t.category}</Td>
                        <Td>{formatGHS(t.amount)}</Td>
                        <Td>{t.payment_method}</Td>
                        <Td>
                          <StatusBadge status={t.status} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableContainer>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
