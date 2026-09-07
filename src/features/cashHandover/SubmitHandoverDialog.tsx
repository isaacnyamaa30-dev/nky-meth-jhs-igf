import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { listStaff } from '@/services/staff'
import { submitHandover } from '@/services/cashHandovers'
import { formatGHS } from '@/lib/currency'

const schema = z
  .object({
    teacher_id: z.string().min(1, 'Select a teacher'),
    handover_date: z.string().min(1, 'Date is required'),
    start_period: z.string().min(1, 'Start of period is required'),
    end_period: z.string().min(1, 'End of period is required'),
    declared_amount: z.coerce.number().min(0.01, 'Enter the amount you are declaring'),
    notes: z.string(),
  })
  .refine((v) => v.end_period >= v.start_period, { message: 'End must be on or after start', path: ['end_period'] })
type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

export function SubmitHandoverDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { staff, role } = useAuth()
  const isBackOffice = role === 'admin' || role === 'accounts'

  const { data: staffList } = useQuery({ queryKey: ['staff'], queryFn: listStaff, enabled: open && isBackOffice })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      teacher_id: staff?.id ?? '',
      handover_date: new Date().toISOString().slice(0, 10),
      start_period: new Date().toISOString().slice(0, 10),
      end_period: new Date().toISOString().slice(0, 10),
      declared_amount: 0,
      notes: '',
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        teacher_id: staff?.id ?? '',
        handover_date: new Date().toISOString().slice(0, 10),
        start_period: new Date().toISOString().slice(0, 10),
        end_period: new Date().toISOString().slice(0, 10),
        declared_amount: 0,
        notes: '',
      })
    }
  }, [open, staff, reset])

  async function onSubmit(values: FormOutput) {
    try {
      const calculated = await submitHandover(values)
      if (Math.abs(calculated - values.declared_amount) > 0.005) {
        toast.success(
          `Handover submitted. Note: the system calculated ${formatGHS(calculated)} in collections for this period, which differs from your declared ${formatGHS(values.declared_amount)}.`,
        )
      } else {
        toast.success('Handover submitted.')
      }
      queryClient.invalidateQueries({ queryKey: ['cash-handovers'] })
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Submit Cash Handover"
      description="Declare the money you are handing over to the accounts officer for a period."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isBackOffice && (
          <div>
            <Label htmlFor="teacher_id">Teacher</Label>
            <Select id="teacher_id" {...register('teacher_id')}>
              <option value="">Select teacher</option>
              {staffList
                ?.filter((s) => s.status === 'Active')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
            </Select>
            {errors.teacher_id && <p className="mt-1 text-xs text-danger">{errors.teacher_id.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="start_period">Period start</Label>
            <Input id="start_period" type="date" {...register('start_period')} />
          </div>
          <div>
            <Label htmlFor="end_period">Period end</Label>
            <Input id="end_period" type="date" {...register('end_period')} />
            {errors.end_period && <p className="mt-1 text-xs text-danger">{errors.end_period.message}</p>}
          </div>
          <div>
            <Label htmlFor="handover_date">Handover date</Label>
            <Input id="handover_date" type="date" {...register('handover_date')} />
          </div>
        </div>

        <div>
          <Label htmlFor="declared_amount">Amount you are declaring (GH₵)</Label>
          <Input id="declared_amount" type="number" step="0.01" min="0.01" {...register('declared_amount')} />
          {errors.declared_amount && <p className="mt-1 text-xs text-danger">{errors.declared_amount.message}</p>}
          <p className="mt-1 text-xs text-muted">
            The system will automatically calculate what you collected in this period from your recorded
            transactions for comparison.
          </p>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={2} {...register('notes')} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit Handover'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
