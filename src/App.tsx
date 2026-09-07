import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { PageLoader } from '@/components/ui/spinner'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const StaffPage = lazy(() => import('@/features/staff/StaffPage').then((m) => ({ default: m.StaffPage })))
const StudentsPage = lazy(() => import('@/features/students/StudentsPage').then((m) => ({ default: m.StudentsPage })))
const ClassesPage = lazy(() => import('@/features/classes/ClassesPage').then((m) => ({ default: m.ClassesPage })))
const TermsPage = lazy(() => import('@/features/terms/TermsPage').then((m) => ({ default: m.TermsPage })))
const CollectionsPage = lazy(() => import('@/features/collections/CollectionsPage').then((m) => ({ default: m.CollectionsPage })))
const UniformSalesPage = lazy(() => import('@/features/uniform/UniformSalesPage').then((m) => ({ default: m.UniformSalesPage })))
const CashHandoverPage = lazy(() => import('@/features/cashHandover/CashHandoverPage').then((m) => ({ default: m.CashHandoverPage })))
const OutstandingPaymentsPage = lazy(() =>
  import('@/features/reports/OutstandingPaymentsPage').then((m) => ({ default: m.OutstandingPaymentsPage })),
)
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const AuditLogsPage = lazy(() => import('@/features/audit/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Lazy>
                <DashboardPage />
              </Lazy>
            }
          />
          <Route
            path="/collections"
            element={
              <Lazy>
                <CollectionsPage />
              </Lazy>
            }
          />
          <Route
            path="/students"
            element={
              <Lazy>
                <StudentsPage />
              </Lazy>
            }
          />
          <Route
            path="/classes"
            element={
              <Lazy>
                <ClassesPage />
              </Lazy>
            }
          />
          <Route element={<ProtectedRoute allowedRoles={['admin', 'headteacher']} />}>
            <Route
              path="/staff"
              element={
                <Lazy>
                  <StaffPage />
                </Lazy>
              }
            />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'accounts', 'teacher']} />}>
            <Route
              path="/uniform-sales"
              element={
                <Lazy>
                  <UniformSalesPage />
                </Lazy>
              }
            />
            <Route
              path="/cash-handover"
              element={
                <Lazy>
                  <CashHandoverPage />
                </Lazy>
              }
            />
          </Route>
          <Route
            path="/outstanding"
            element={
              <Lazy>
                <OutstandingPaymentsPage />
              </Lazy>
            }
          />
          <Route
            path="/reports"
            element={
              <Lazy>
                <ReportsPage />
              </Lazy>
            }
          />
          <Route element={<ProtectedRoute allowedRoles={['admin', 'headteacher', 'accounts']} />}>
            <Route
              path="/terms"
              element={
                <Lazy>
                  <TermsPage />
                </Lazy>
              }
            />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route
              path="/audit-logs"
              element={
                <Lazy>
                  <AuditLogsPage />
                </Lazy>
              }
            />
            <Route
              path="/settings"
              element={
                <Lazy>
                  <SettingsPage />
                </Lazy>
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
