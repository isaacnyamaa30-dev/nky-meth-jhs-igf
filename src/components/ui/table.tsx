import * as React from 'react'
import { cn } from '@/lib/utils'

export function TableContainer({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('scrollbar-thin overflow-x-auto rounded-xl border border-border bg-surface', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-border bg-brand-50/60 text-left text-xs uppercase tracking-wide text-muted">{children}</thead>
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('whitespace-nowrap px-4 py-3 font-medium', className)} {...props} />
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('whitespace-nowrap px-4 py-3', className)} {...props} />
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-border last:border-0 hover:bg-brand-50/40', className)} {...props} />
}

export function EmptyState({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={100} className="px-4 py-10 text-center text-sm text-muted">
        {message}
      </td>
    </tr>
  )
}
