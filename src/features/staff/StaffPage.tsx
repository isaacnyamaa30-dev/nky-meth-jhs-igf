import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast, friendlyError } from '@/components/ui/toast'
import { listStaff, sendPasswordReset, setStaffStatus, type StaffWithClass } from '@/services/staff'
import { useAuth } from '@/features/auth/AuthProvider'
import { StaffFormDialog } from './StaffFormDialog'

export function StaffPage() {
  const { role } = useAuth()
  const canManage = role === 'admin'
  const [search, setSearch] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<StaffWithClass | null>(null)
  const [statusTarget, setStatusTarget] = React.useState<StaffWithClass | null>(null)

  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: staff, isLoading } = useQuery({ queryKey: ['staff'], queryFn: listStaff })

  const filtered = (staff ?? []).filter((s) => {
    const q = search.toLowerCase()
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.staff_number.toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.job_title ?? '').toLowerCase().includes(q)
    )
  })

  async function handleToggleStatus() {
    if (!statusTarget) return
    const nextStatus = statusTarget.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await setStaffStatus(statusTarget.id, nextStatus)
      toast.success(`${statusTarget.full_name} is now ${nextStatus}.`)
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setStatusTarget(null)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  async function handleResetPassword(s: StaffWithClass) {
    if (!s.email) {
      toast.error('This staff member has no email on file. Add one before sending a reset link.')
      return
    }
    try {
      await sendPasswordReset(s.email)
      toast.success(`Password reset link sent to ${s.email}.`)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-gradient-navy">Staff</h1>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus size={16} /> Add Staff
          </Button>
        )}
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search by name, staff number, email or job title…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : (
        <TableContainer>
          <Thead>
            <tr>
              <Th>Staff #</Th>
              <Th>Name</Th>
              <Th>Job Title</Th>
              <Th>Class</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              {canManage && <Th>Actions</Th>}
            </tr>
          </Thead>
          <tbody>
            {filtered.length === 0 && <EmptyState message="No staff found." />}
            {filtered.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium text-foreground">{s.staff_number}</Td>
                <Td>{s.full_name}</Td>
                <Td>{s.job_title ?? '—'}</Td>
                <Td>{s.classes?.class_name ?? '—'}</Td>
                <Td className="capitalize">{s.user_role}</Td>
                <Td>
                  <StatusBadge status={s.status} />
                </Td>
                {canManage && (
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="text-sm font-medium text-brand-700 hover:underline"
                        onClick={() => {
                          setEditing(s)
                          setFormOpen(true)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm font-medium text-brand-700 hover:underline"
                        onClick={() => handleResetPassword(s)}
                      >
                        Reset Password
                      </button>
                      <button
                        className={s.status === 'Active' ? 'text-sm font-medium text-danger hover:underline' : 'text-sm font-medium text-brand-700 hover:underline'}
                        onClick={() => setStatusTarget(s)}
                      >
                        {s.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </TableContainer>
      )}

      <StaffFormDialog open={formOpen} onOpenChange={setFormOpen} staff={editing} />

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(o) => !o && setStatusTarget(null)}
        title={statusTarget?.status === 'Active' ? 'Deactivate staff member?' : 'Reactivate staff member?'}
        description={
          statusTarget?.status === 'Active'
            ? `${statusTarget?.full_name} will no longer be able to record collections. Their history is kept.`
            : `${statusTarget?.full_name} will regain access to record collections.`
        }
        confirmLabel={statusTarget?.status === 'Active' ? 'Deactivate' : 'Reactivate'}
        variant={statusTarget?.status === 'Active' ? 'danger' : 'primary'}
        onConfirm={handleToggleStatus}
      />
    </div>
  )
}
