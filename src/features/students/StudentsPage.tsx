import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { listStudents, type StudentWithClass } from '@/services/students'
import { listClasses } from '@/services/classes'
import { StudentFormDialog } from './StudentFormDialog'

export function StudentsPage() {
  const { role } = useAuth()
  const canManage = role === 'admin'
  const [search, setSearch] = React.useState('')
  const [classFilter, setClassFilter] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<StudentWithClass | null>(null)

  const { data: students, isLoading } = useQuery({ queryKey: ['students'], queryFn: listStudents })
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: listClasses })

  const filtered = (students ?? []).filter((s) => {
    const q = search.toLowerCase()
    const matchesSearch =
      s.full_name.toLowerCase().includes(q) ||
      s.student_number.toLowerCase().includes(q) ||
      (s.parent_guardian_name ?? '').toLowerCase().includes(q)
    const matchesClass = !classFilter || s.class_id === classFilter
    return matchesSearch && matchesClass
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-gradient-navy">Students</h1>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus size={16} /> Add Student
          </Button>
        )}
      </div>

      <Card className="flex flex-col gap-3 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search by name, student number or parent…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select className="sm:w-56" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.class_name}
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
              <Th>Student #</Th>
              <Th>Name</Th>
              <Th>Class</Th>
              <Th>Parent/Guardian</Th>
              <Th>Status</Th>
              {canManage && <Th>Actions</Th>}
            </tr>
          </Thead>
          <tbody>
            {filtered.length === 0 && <EmptyState message="No students found." />}
            {filtered.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium text-foreground">{s.student_number}</Td>
                <Td>{s.full_name}</Td>
                <Td>{s.classes?.class_name ?? '—'}</Td>
                <Td>
                  {s.parent_guardian_name ?? '—'}
                  {s.parent_guardian_phone ? ` · ${s.parent_guardian_phone}` : ''}
                </Td>
                <Td>
                  <StatusBadge status={s.admission_status} />
                </Td>
                {canManage && (
                  <Td>
                    <button
                      className="text-sm font-medium text-brand-700 hover:underline"
                      onClick={() => {
                        setEditing(s)
                        setFormOpen(true)
                      }}
                    >
                      Edit
                    </button>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </TableContainer>
      )}

      {canManage && <StudentFormDialog open={formOpen} onOpenChange={setFormOpen} student={editing} />}
    </div>
  )
}
