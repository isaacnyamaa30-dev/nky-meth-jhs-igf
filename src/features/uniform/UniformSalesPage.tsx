import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { TableContainer, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/table'
import { PageLoader } from '@/components/ui/spinner'
import { formatGHS } from '@/lib/currency'
import { listUniformItems } from '@/services/uniformItems'
import { listUniformSales } from '@/services/uniformSales'
import { UniformItemFormDialog } from './UniformItemFormDialog'
import { UniformSaleFormDialog } from './UniformSaleFormDialog'

export function UniformSalesPage() {
  const { role, staff } = useAuth()
  const isAdmin = role === 'admin'
  const [itemFormOpen, setItemFormOpen] = React.useState(false)
  const [saleFormOpen, setSaleFormOpen] = React.useState(false)

  const { data: items, isLoading: itemsLoading } = useQuery({ queryKey: ['uniform-items', false], queryFn: () => listUniformItems(false) })
  const { data: sales, isLoading: salesLoading } = useQuery({ queryKey: ['uniform-sales'], queryFn: () => listUniformSales(100) })

  if (!staff) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Your login isn't linked to a staff record yet, so you can't record uniform sales. Ask an administrator to
        link your account under Staff.
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-foreground">Uniform Sales</h1>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setItemFormOpen(true)}>
              <Plus size={16} /> Add Item
            </Button>
          )}
          <Button onClick={() => setSaleFormOpen(true)}>
            <Plus size={16} /> Record Sale
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {itemsLoading ? (
            <PageLoader />
          ) : (
            <TableContainer className="rounded-none border-0">
              <Thead>
                <tr>
                  <Th>Item</Th>
                  <Th>Category</Th>
                  <Th>Unit Price</Th>
                  <Th>In Stock</Th>
                  <Th>Reorder Level</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {(items ?? []).length === 0 && <EmptyState message="No uniform items yet." />}
                {items?.map((i) => (
                  <Tr key={i.id}>
                    <Td className="font-medium text-foreground">
                      {i.item_name} {i.size ? `(${i.size})` : ''}
                    </Td>
                    <Td>{i.gender_category}</Td>
                    <Td>{formatGHS(i.unit_price)}</Td>
                    <Td>
                      <span className="flex items-center gap-1.5">
                        {i.current_stock}
                        {i.current_stock <= i.reorder_level && (
                          <AlertTriangle size={14} className="text-gold-600" aria-label="Low stock" />
                        )}
                      </span>
                    </Td>
                    <Td>{i.reorder_level}</Td>
                    <Td>
                      <StatusBadge status={i.active ? 'Active' : 'Inactive'} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {salesLoading ? (
            <PageLoader />
          ) : (
            <TableContainer className="rounded-none border-0">
              <Thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Item</Th>
                  <Th>Student</Th>
                  <Th>Qty</Th>
                  <Th>Total</Th>
                  <Th>Payment</Th>
                  <Th>Sold By</Th>
                </tr>
              </Thead>
              <tbody>
                {(sales ?? []).length === 0 && <EmptyState message="No uniform sales recorded yet." />}
                {sales?.map((s) => (
                  <Tr key={s.id}>
                    <Td>{s.sale_date}</Td>
                    <Td>
                      {s.uniform_items?.item_name} {s.uniform_items?.size ? `(${s.uniform_items.size})` : ''}
                    </Td>
                    <Td>{s.students?.full_name ?? 'Walk-in'}</Td>
                    <Td>{s.quantity}</Td>
                    <Td className="font-medium text-foreground">{formatGHS(s.total_amount)}</Td>
                    <Td>
                      <StatusBadge status={s.payment_status} />
                    </Td>
                    <Td>{s.staff?.full_name ?? '—'}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {isAdmin && <UniformItemFormDialog open={itemFormOpen} onOpenChange={setItemFormOpen} />}
      <UniformSaleFormDialog open={saleFormOpen} onOpenChange={setSaleFormOpen} />
    </div>
  )
}
