import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  React.useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10 sm:pt-16">
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn('relative z-10 w-full max-w-lg rounded-xl border border-border bg-surface shadow-lg', className)}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 id="dialog-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted hover:bg-brand-50 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'primary',
  onConfirm,
  requireReason = false,
  reason,
  onReasonChange,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  variant?: 'primary' | 'danger'
  onConfirm: () => void
  requireReason?: boolean
  reason?: string
  onReasonChange?: (value: string) => void
  submitting?: boolean
}) {
  const canConfirm = !requireReason || !!reason?.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="space-y-4">
        {requireReason && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="confirm-reason">
              Reason (required)
            </label>
            <textarea
              id="confirm-reason"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              rows={3}
              value={reason ?? ''}
              onChange={(e) => onReasonChange?.(e.target.value)}
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-brand-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm || submitting}
            onClick={onConfirm}
            className={cn(
              'h-10 rounded-lg px-4 text-sm font-medium text-white disabled:opacity-50',
              variant === 'danger' ? 'bg-danger hover:bg-red-800' : 'bg-brand-900 hover:bg-brand-800',
            )}
          >
            {submitting ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
