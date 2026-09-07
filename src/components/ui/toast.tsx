import * as React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

const ToastContext = React.createContext<{
  success: (message: string) => void
  error: (message: string) => void
} | undefined>(undefined)

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const push = React.useCallback((message: string, tone: Toast['tone']) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, tone }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const value = React.useMemo(
    () => ({
      success: (message: string) => push(message, 'success'),
      error: (message: string) => push(message, 'error'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'flex items-start gap-2 rounded-lg border p-3 text-sm shadow-md',
              t.tone === 'success' ? 'border-brand-200 bg-brand-50 text-brand-900' : 'border-red-200 bg-red-50 text-danger',
            )}
          >
            {t.tone === 'success' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={18} className="mt-0.5 shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

/** Turns a Supabase/Postgres error into simple, non-technical wording. */
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('duplicate key') || message.includes('already exists')) {
    return 'That record already exists (a duplicate number, email, or name). Please check and try again.'
  }
  if (message.includes('permission denied') || message.includes('row-level security')) {
    return "You don't have permission to do that."
  }
  if (message.includes('violates foreign key')) {
    return 'This record is linked to other data and cannot be changed that way.'
  }
  if (message.includes('Insufficient stock')) {
    return "There isn't enough stock left for that quantity."
  }
  if (message.includes('No term covers date')) {
    return 'That date falls outside any configured term. Pick a date within the active term, or ask an administrator to create the matching term.'
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Could not reach the server. Check your internet connection and try again.'
  }
  return 'Something went wrong. Please try again or contact the administrator.'
}
