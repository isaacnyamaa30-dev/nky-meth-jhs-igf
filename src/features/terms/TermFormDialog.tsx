import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { createTerm, listAcademicYears } from '@/services/terms'

const schema = z.object({
  academic_year_id: z.string().min(1, 'Select an academic year'),
  term_name: z.enum(['Term 1', 'Term 2', 'Term 3']),
  start_date: z
    .string()
    .min(1, 'Start date is required')
    .refine((v) => new Date(v + 'T00:00:00Z').getUTCDay() === 1, 'Start date must be a Monday — the term calendar is built as Mon–Fri weeks'),
  number_of_weeks: z.coerce.number().int().min(1, 'Must be at least 1 week').max(20, 'Must be 20 weeks or fewer'),
})
type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

export function TermFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: listAcademicYears, enabled: open })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { academic_year_id: '', term_name: 'Term 1', start_date: '', number_of_weeks: 14 },
  })

  async function onSubmit(values: FormOutput) {
    try {
      await createTerm(values)
      toast.success(`${values.term_name} created with ${values.number_of_weeks} weeks.`)
      queryClient.invalidateQueries({ queryKey: ['terms'] })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add Term" description="Automatically generates the week-by-week school calendar.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="academic_year_id">Academic year</Label>
          <Select id="academic_year_id" {...register('academic_year_id')}>
            <option value="">Select academic year</option>
            {years?.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </Select>
          {errors.academic_year_id && <p className="mt-1 text-xs text-danger">{errors.academic_year_id.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="term_name">Term</Label>
            <Select id="term_name" {...register('term_name')}>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="number_of_weeks">Number of weeks</Label>
            <Input id="number_of_weeks" type="number" min={1} max={20} {...register('number_of_weeks')} />
            {errors.number_of_weeks && <p className="mt-1 text-xs text-danger">{errors.number_of_weeks.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="start_date">Start date (must be a Monday)</Label>
          <Input id="start_date" type="date" {...register('start_date')} />
          {errors.start_date && <p className="mt-1 text-xs text-danger">{errors.start_date.message}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Add Term'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
