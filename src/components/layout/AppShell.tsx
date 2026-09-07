import * as React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Menu, X, LogOut, WifiOff } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { NAV_ITEMS } from './nav-items'
import { Footer } from './Footer'
import { cn } from '@/lib/utils'

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth()
  const items = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)))

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-900 text-white' : 'text-brand-50/90 hover:bg-brand-800',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { profile, staff, signOut } = useAuth()
  const online = useOnlineStatus()
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col bg-brand-950 py-6 text-white lg:flex">
        <div className="mb-6 flex items-center gap-3 px-4">
          <img src="/logo.png" alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">NKY. METH. JHS</p>
            <p className="text-xs text-brand-100/80">IGF Tracker</p>
          </div>
        </div>
        <SidebarLinks />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-brand-950 py-6 text-white">
            <div className="mb-6 flex items-center justify-between px-4">
              <div className="flex min-w-0 items-center gap-3">
                <img src="/logo.png" alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">NKY. METH. JHS</p>
                  <p className="text-xs text-brand-100/80">IGF Tracker</p>
                </div>
              </div>
              <button
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-1.5 hover:bg-brand-800"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarLinks onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-gold-400 px-4 py-2 text-sm font-medium text-brand-950">
            <WifiOff size={16} />
            You are currently offline. Financial entries require an internet connection.
          </div>
        )}

        <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="shrink-0 rounded-md p-2 hover:bg-brand-50 lg:hidden"
            >
              <Menu size={22} />
            </button>
            <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 rounded-full object-cover lg:hidden" />
            <span className="hidden truncate text-sm text-muted lg:block">Nyankyerenease Methodist JHS</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium text-foreground">{profile?.full_name ?? 'Loading…'}</p>
              <p className="truncate text-xs capitalize text-muted">{staff?.job_title ?? profile?.role}</p>
            </div>
            <button
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="shrink-0 rounded-full p-2 text-muted hover:bg-brand-50 hover:text-brand-800"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  )
}
