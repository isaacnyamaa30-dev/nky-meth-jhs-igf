import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { getActiveAcademicYear } from '@/services/reference'
import { createClass, updateClass, type ClassWithTeacher } from '@/services/classes'
import { listStaff } from '@/services/staff'

const schema = z.object({
  class_name: z.string().trim().min(2, 'Class name is required'),
  class_teacher_id: z.string(),
})
type FormShape = z.infer<typeof schema>

export function ClassFormDialog({
  open,
  onOpenChange,
  schoolClass,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolClass?: ClassWithTeacher | null
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEdit = !!schoolClass

  const { data: activeYear } = useQuery({ queryKey: ['active-academic-year'], queryFn: getActiveAcademicYear, enabled: open })
  const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: listStaff, enabled: open })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormShape>({ resolver: zodResolver(schema), defaultValues: { class_name: '', class_teacher_id: '' } })

  React.useEffect(() => {
    if (!open) return
    reset({
      class_name: schoolClass?.class_name ?? '',
      class_teacher_id: schoolClass?.class_teacher_id ?? '',
    })
  }, [open, schoolClass, reset])

  async function onSubmit(values: FormShape) {
    try {
      if (isEdit && schoolClass) {
        await updateClass(schoolClass.id, values)
        toast.success('Class updated.')
      } else {
        if (!activeYear) {
          toast.error('No active academic year is configured yet.')
          return
        }
        await createClass({ ...values, academic_year_id: activeYear.id })
        toast.success('Class created.')
      }
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['active-classes'] })
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? 'Edit Class' : 'Add Class'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="class_name">Class name</Label>
          <Input id="class_name" placeholder="e.g. JHS 1A" {...register('class_name')} />
          {errors.class_name && <p className="mt-1 text-xs text-danger">{errors.class_name.message}</p>}
        </div>
        <div>
          <Label htmlFor="class_teacher_id">Class teacher</Label>
          <Select id="class_teacher_id" {...register('class_teacher_id')}>
            <option value="">Unassigned</option>
            {staff?.filter((s) => s.status === 'Active').map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Class'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
