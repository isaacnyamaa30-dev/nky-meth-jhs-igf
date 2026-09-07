import type { UserRole } from '@/types/domain'

export interface NavItem {
  label: string
  to: string
  roles?: UserRole[] // undefined = visible to every signed-in role
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Collections', to: '/collections' },
  { label: 'Students', to: '/students' },
  { label: 'Classes', to: '/classes' },
  { label: 'Staff', to: '/staff', roles: ['admin', 'headteacher'] },
  { label: 'Uniform Sales', to: '/uniform-sales', roles: ['admin', 'accounts', 'teacher'] },
  { label: 'Cash Handover', to: '/cash-handover', roles: ['admin', 'accounts', 'teacher'] },
  { label: 'Outstanding Payments', to: '/outstanding' },
  { label: 'Reports', to: '/reports' },
  { label: 'Terms', to: '/terms', roles: ['admin', 'headteacher', 'accounts'] },
  { label: 'Audit Logs', to: '/audit-logs', roles: ['admin'] },
  { label: 'Settings', to: '/settings', roles: ['admin'] },
]
