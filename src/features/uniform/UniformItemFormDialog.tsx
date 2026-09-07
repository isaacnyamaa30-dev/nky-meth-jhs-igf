import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { createUniformItem } from '@/services/uniformItems'

const schema = z.object({
  item_name: z.string().trim().min(2, 'Item name is required'),
  gender_category: z.enum(['Boys', 'Girls', 'Unisex']),
  size: z.string().trim(),
  unit_price: z.coerce.number().positive('Unit price must be greater than zero'),
  opening_stock: z.coerce.number().int().min(0, 'Cannot be negative'),
  reorder_level: z.coerce.number().int().min(0, 'Cannot be negative'),
})
type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

export function UniformItemFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { item_name: '', gender_category: 'Unisex', size: '', unit_price: 0, opening_stock: 0, reorder_level: 5 },
  })

  async function onSubmit(values: FormOutput) {
    try {
      await createUniformItem(values)
      toast.success(`${values.item_name} added to inventory.`)
      queryClient.invalidateQueries({ queryKey: ['uniform-items'] })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add Uniform Item">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="item_name">Item name</Label>
          <Input id="item_name" placeholder="e.g. School Shirt" {...register('item_name')} />
          {errors.item_name && <p className="mt-1 text-xs text-danger">{errors.item_name.message}</p>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="gender_category">Category</Label>
            <Select id="gender_category" {...register('gender_category')}>
              <option value="Unisex">Unisex</option>
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="size">Size</Label>
            <Input id="size" placeholder="e.g. Medium" {...register('size')} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="unit_price">Unit price (GH₵)</Label>
            <Input id="unit_price" type="number" step="0.01" min="0.01" {...register('unit_price')} />
            {errors.unit_price && <p className="mt-1 text-xs text-danger">{errors.unit_price.message}</p>}
          </div>
          <div>
            <Label htmlFor="opening_stock">Opening stock</Label>
            <Input id="opening_stock" type="number" min="0" step="1" {...register('opening_stock')} />
          </div>
          <div>
            <Label htmlFor="reorder_level">Reorder level</Label>
            <Input id="reorder_level" type="number" min="0" step="1" {...register('reorder_level')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Add Item'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
