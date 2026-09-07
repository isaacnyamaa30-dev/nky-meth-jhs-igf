import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { createCollectionType } from '@/services/collectionTypes'

const schema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  description: z.string().trim(),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Termly', 'Once-Off', 'Intermittent']),
  calculation_method: z.enum(['Fixed per student', 'Fixed per class', 'Variable amount', 'Quantity x unit price', 'General collection']),
  default_amount: z.string(),
  student_specific: z.boolean(),
  class_specific: z.boolean(),
})
type FormShape = z.infer<typeof schema>

export function CollectionTypeFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormShape>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      frequency: 'Intermittent',
      calculation_method: 'Variable amount',
      default_amount: '',
      student_specific: false,
      class_specific: false,
    },
  })

  async function onSubmit(values: FormShape) {
    try {
      await createCollectionType(values)
      toast.success(`Collection type "${values.name}" added.`)
      queryClient.invalidateQueries({ queryKey: ['collection-types'] })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add Collection Type">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="ct-name">Name</Label>
          <Input id="ct-name" placeholder="e.g. Textbook Levy" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="ct-description">Description</Label>
          <Textarea id="ct-description" rows={2} {...register('description')} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ct-frequency">Frequency</Label>
            <Select id="ct-frequency" {...register('frequency')}>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Termly">Termly</option>
              <option value="Once-Off">Once-Off</option>
              <option value="Intermittent">Intermittent</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ct-calc">Calculation method</Label>
            <Select id="ct-calc" {...register('calculation_method')}>
              <option value="Fixed per student">Fixed per student</option>
              <option value="Fixed per class">Fixed per class</option>
              <option value="Variable amount">Variable amount</option>
              <option value="Quantity x unit price">Quantity x unit price</option>
              <option value="General collection">General collection</option>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="ct-amount">Default amount (GH₵, optional)</Label>
          <Input id="ct-amount" type="number" step="0.01" min="0" {...register('default_amount')} />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('student_specific')} />
            Tracked per student
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('class_specific')} />
            Tied to a class
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Add Collection Type'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
