import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast, friendlyError } from '@/components/ui/toast'
import { listAcademicYears, listTerms, setActiveAcademicYear, setActiveTerm, type TermWithYear } from '@/services/terms'
import type { AcademicYear } from '@/types/domain'
import { AcademicYearFormDialog } from './AcademicYearFormDialog'
import { TermFormDialog } from './TermFormDialog'

export function TermsPage() {
  const { role } = useAuth()
  const canManage = role === 'admin'
  const toast = useToast()
  const queryClient = useQueryClient()

  const [yearFormOpen, setYearFormOpen] = React.useState(false)
  const [termFormOpen, setTermFormOpen] = React.useState(false)
  const [activateYear, setActivateYear] = React.useState<AcademicYear | null>(null)
  const [activateTerm, setActivateTerm] = React.useState<TermWithYear | null>(null)

  const { data: years, isLoading: yearsLoading } = useQuery({ queryKey: ['academic-years'], queryFn: listAcademicYears })
  const { data: terms, isLoading: termsLoading } = useQuery({ queryKey: ['terms'], queryFn: listTerms })

  async function confirmActivateYear() {
    if (!activateYear) return
    try {
      await setActiveAcademicYear(activateYear.id)
      toast.success(`${activateYear.name} is now the active academic year.`)
      queryClient.invalidateQueries({ queryKey: ['academic-years'] })
      queryClient.invalidateQueries({ queryKey: ['active-academic-year'] })
      setActivateYear(null)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  async function confirmActivateTerm() {
    if (!activateTerm) return
    try {
      await setActiveTerm(activateTerm.id)
      toast.success(`${activateTerm.term_name} is now active.`)
      queryClient.invalidateQueries({ queryKey: ['terms'] })
      queryClient.invalidateQueries({ queryKey: ['active-context'] })
      setActivateTerm(null)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Terms</h1>

      <Card>
        <CardHeader>
          <CardTitle>Academic Years</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setYearFormOpen(true)}>
              <Plus size={16} /> Add Academic Year
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {yearsLoading ? (
            <PageLoader />
          ) : (
            <TableContainer className="rounded-none border-0">
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Start</Th>
                  <Th>End</Th>
                  <Th>Status</Th>
                  {canManage && <Th>Actions</Th>}
                </tr>
              </Thead>
              <tbody>
                {(years ?? []).length === 0 && <EmptyState message="No academic years yet." />}
                {years?.map((y) => (
                  <Tr key={y.id}>
                    <Td className="font-medium text-foreground">{y.name}</Td>
                    <Td>{y.start_date}</Td>
                    <Td>{y.end_date}</Td>
                    <Td>
                      <StatusBadge status={y.status} />
                    </Td>
                    {canManage && (
                      <Td>
                        {y.status !== 'Active' && (
                          <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setActivateYear(y)}>
                            Set Active
                          </button>
                        )}
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terms</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setTermFormOpen(true)}>
              <Plus size={16} /> Add Term
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {termsLoading ? (
            <PageLoader />
          ) : (
            <TableContainer className="rounded-none border-0">
              <Thead>
                <tr>
                  <Th>Term</Th>
                  <Th>Academic Year</Th>
                  <Th>Start</Th>
                  <Th>Weeks</Th>
                  <Th>Status</Th>
                  {canManage && <Th>Actions</Th>}
                </tr>
              </Thead>
              <tbody>
                {(terms ?? []).length === 0 && <EmptyState message="No terms yet." />}
                {terms?.map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-medium text-foreground">{t.term_name}</Td>
                    <Td>{t.academic_years?.name ?? '—'}</Td>
                    <Td>{t.start_date}</Td>
                    <Td>{t.number_of_weeks}</Td>
                    <Td>
                      <StatusBadge status={t.status} />
                    </Td>
                    {canManage && (
                      <Td>
                        {t.status !== 'Active' && (
                          <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setActivateTerm(t)}>
                            Set Active
                          </button>
                        )}
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <>
          <AcademicYearFormDialog open={yearFormOpen} onOpenChange={setYearFormOpen} />
          <TermFormDialog open={termFormOpen} onOpenChange={setTermFormOpen} />
          <ConfirmDialog
            open={!!activateYear}
            onOpenChange={(o) => !o && setActivateYear(null)}
            title="Set active academic year?"
            description={`${activateYear?.name} will become the active academic year. Only one academic year can be active at a time.`}
            confirmLabel="Set Active"
            onConfirm={confirmActivateYear}
          />
          <ConfirmDialog
            open={!!activateTerm}
            onOpenChange={(o) => !o && setActivateTerm(null)}
            title="Set active term?"
            description={`${activateTerm?.term_name} will become the active term used throughout the dashboard and reports. Only one term can be active at a time.`}
            confirmLabel="Set Active"
            onConfirm={confirmActivateTerm}
          />
        </>
      )}
    </div>
  )
}
