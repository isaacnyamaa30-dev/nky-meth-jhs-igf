import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { createAcademicYear } from '@/services/terms'

const schema = z
  .object({
    name: z.string().trim().regex(/^\d{4}\/\d{4}$/, 'Use the format 2026/2027'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
  })
  .refine((v) => v.end_date > v.start_date, { message: 'End date must be after start date', path: ['end_date'] })

type FormShape = z.infer<typeof schema>

export function AcademicYearFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormShape>({ resolver: zodResolver(schema), defaultValues: { name: '', start_date: '', end_date: '' } })

  async function onSubmit(values: FormShape) {
    try {
      await createAcademicYear(values)
      toast.success(`Academic year ${values.name} created.`)
      queryClient.invalidateQueries({ queryKey: ['academic-years'] })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add Academic Year">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="2026/2027" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" type="date" {...register('start_date')} />
            {errors.start_date && <p className="mt-1 text-xs text-danger">{errors.start_date.message}</p>}
          </div>
          <div>
            <Label htmlFor="end_date">End date</Label>
            <Input id="end_date" type="date" {...register('end_date')} />
            {errors.end_date && <p className="mt-1 text-xs text-danger">{errors.end_date.message}</p>}
          </div>
        </div>
        <p className="text-xs text-muted">New academic years start as "Upcoming" — set one Active from the list.</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Add Academic Year'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
