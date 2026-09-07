import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast, friendlyError } from '@/components/ui/toast'
import { listClasses, setClassActive, type ClassWithTeacher } from '@/services/classes'
import { ClassFormDialog } from './ClassFormDialog'

export function ClassesPage() {
  const { role } = useAuth()
  const canManage = role === 'admin'
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ClassWithTeacher | null>(null)
  const [toggleTarget, setToggleTarget] = React.useState<ClassWithTeacher | null>(null)

  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: classes, isLoading } = useQuery({ queryKey: ['classes'], queryFn: listClasses })

  async function handleToggleActive() {
    if (!toggleTarget) return
    try {
      await setClassActive(toggleTarget.id, !toggleTarget.active)
      toast.success(`${toggleTarget.class_name} is now ${!toggleTarget.active ? 'active' : 'inactive'}.`)
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setToggleTarget(null)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-foreground">Classes</h1>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus size={16} /> Add Class
          </Button>
        )}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (classes ?? []).length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No classes yet.</Card>
      ) : (
        <TableContainer>
          <Thead>
            <tr>
              <Th>Class</Th>
              <Th>Class Teacher</Th>
              <Th>Status</Th>
              {canManage && <Th>Actions</Th>}
            </tr>
          </Thead>
          <tbody>
            {(classes ?? []).length === 0 && <EmptyState message="No classes found." />}
            {classes?.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-foreground">{c.class_name}</Td>
                <Td>{c.staff?.full_name ?? 'Unassigned'}</Td>
                <Td>
                  <Badge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Active' : 'Inactive'}</Badge>
                </Td>
                {canManage && (
                  <Td>
                    <div className="flex gap-2">
                      <button
                        className="text-sm font-medium text-brand-700 hover:underline"
                        onClick={() => {
                          setEditing(c)
                          setFormOpen(true)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className={c.active ? 'text-sm font-medium text-danger hover:underline' : 'text-sm font-medium text-brand-700 hover:underline'}
                        onClick={() => setToggleTarget(c)}
                      >
                        {c.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </TableContainer>
      )}

      {canManage && (
        <>
          <ClassFormDialog open={formOpen} onOpenChange={setFormOpen} schoolClass={editing} />
          <ConfirmDialog
            open={!!toggleTarget}
            onOpenChange={(o) => !o && setToggleTarget(null)}
            title={toggleTarget?.active ? 'Deactivate class?' : 'Reactivate class?'}
            description={
              toggleTarget?.active
                ? `${toggleTarget?.class_name} will be hidden from new collection entry. Existing records are kept.`
                : `${toggleTarget?.class_name} will become available again.`
            }
            confirmLabel={toggleTarget?.active ? 'Deactivate' : 'Reactivate'}
            variant={toggleTarget?.active ? 'danger' : 'primary'}
            onConfirm={handleToggleActive}
          />
        </>
      )}
    </div>
  )
}
