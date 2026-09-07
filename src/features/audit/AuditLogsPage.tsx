import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { Dialog } from '@/components/ui/dialog'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, listAuditLogs, type AuditLogWithUser } from '@/services/auditLogs'

const ACTION_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Create: 'success',
  Update: 'warning',
  Void: 'danger',
  Delete: 'danger',
}

export function AuditLogsPage() {
  const [entityType, setEntityType] = React.useState('')
  const [action, setAction] = React.useState('')
  const [detail, setDetail] = React.useState<AuditLogWithUser | null>(null)

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, action],
    queryFn: () => listAuditLogs({ entityType: entityType || undefined, action: action || undefined }),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gradient-navy">Audit Logs</h1>

      <Card className="flex flex-col gap-3 p-3 sm:flex-row">
        <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="sm:w-56">
          <option value="">All record types</option>
          {AUDIT_ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="sm:w-56">
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : (
        <TableContainer>
          <Thead>
            <tr>
              <Th>When</Th>
              <Th>User</Th>
              <Th>Action</Th>
              <Th>Record Type</Th>
              <Th>Reason</Th>
              <Th>Details</Th>
            </tr>
          </Thead>
          <tbody>
            {(logs ?? []).length === 0 && <EmptyState message="No audit activity matches these filters." />}
            {logs?.map((log) => (
              <Tr key={log.id}>
                <Td>{new Date(log.created_at).toLocaleString()}</Td>
                <Td>{log.profiles?.full_name ?? 'System'}</Td>
                <Td>
                  <Badge tone={ACTION_TONE[log.action] ?? 'neutral'}>{log.action}</Badge>
                </Td>
                <Td>{log.entity_type}</Td>
                <Td className="max-w-xs truncate">{log.reason ?? '—'}</Td>
                <Td>
                  <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setDetail(log)}>
                    View
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableContainer>
      )}

      <Dialog
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={`${detail?.action} — ${detail?.entity_type}`}
        description={detail ? new Date(detail.created_at).toLocaleString() : undefined}
      >
        {detail && (
          <div className="space-y-3 text-sm">
            {detail.reason && (
              <p>
                <span className="font-medium text-foreground">Reason: </span>
                {detail.reason}
              </p>
            )}
            {detail.old_values && (
              <div>
                <p className="mb-1 font-medium text-foreground">Before</p>
                <pre className="max-h-48 overflow-auto rounded-lg bg-brand-50 p-3 text-xs">
                  {JSON.stringify(detail.old_values, null, 2)}
                </pre>
              </div>
            )}
            {detail.new_values && (
              <div>
                <p className="mb-1 font-medium text-foreground">After</p>
                <pre className="max-h-48 overflow-auto rounded-lg bg-brand-50 p-3 text-xs">
                  {JSON.stringify(detail.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
