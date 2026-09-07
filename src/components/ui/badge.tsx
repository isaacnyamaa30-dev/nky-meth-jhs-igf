import * as React from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-brand-100 text-brand-800',
  warning: 'bg-gold-100 text-gold-700',
  danger: 'bg-red-100 text-red-700',
  brand: 'bg-brand-900 text-white',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}

const STATUS_TONE: Record<string, Tone> = {
  Paid: 'success',
  Confirmed: 'success',
  Reconciled: 'success',
  Received: 'success',
  Resolved: 'success',
  Active: 'success',
  'Partially Paid': 'warning',
  Pending: 'warning',
  Draft: 'neutral',
  Submitted: 'warning',
  Discrepancy: 'danger',
  'Not Paid': 'danger',
  Voided: 'danger',
  Refunded: 'neutral',
  Waived: 'brand',
  Inactive: 'neutral',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status}</Badge>
}
