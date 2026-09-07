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
import { listActiveClasses } from '@/services/classes'
import {
  createStudent,
  nextStudentNumber,
  updateStudent,
  type StudentFormValues,
  type StudentWithClass,
} from '@/services/students'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required'),
  gender: z.union([z.literal(''), z.literal('Male'), z.literal('Female'), z.literal('Other')]),
  class_id: z.string().min(1, 'Select a class'),
  parent_guardian_name: z.string().trim(),
  parent_guardian_phone: z
    .string()
    .trim()
    .refine((v) => !v || /^(0\d{9}|\+233\d{9})$/.test(v), 'Enter a valid Ghanaian number, e.g. 0244123456'),
  admission_status: z.enum(['Active', 'Transferred', 'Graduated', 'Withdrawn', 'Inactive']),
})
type FormShape = z.infer<typeof schema>

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: StudentWithClass | null
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEdit = !!student

  const { data: activeYear } = useQuery({ queryKey: ['active-academic-year'], queryFn: getActiveAcademicYear, enabled: open })
  const { data: classes } = useQuery({ queryKey: ['active-classes'], queryFn: listActiveClasses, enabled: open })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormShape>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      gender: '',
      class_id: '',
      parent_guardian_name: '',
      parent_guardian_phone: '',
      admission_status: 'Active',
    },
  })

  React.useEffect(() => {
    if (!open) return
    if (student) {
      reset({
        full_name: student.full_name,
        gender: (student.gender ?? '') as FormShape['gender'],
        class_id: student.class_id,
        parent_guardian_name: student.parent_guardian_name ?? '',
        parent_guardian_phone: student.parent_guardian_phone ?? '',
        admission_status: student.admission_status,
      })
    } else {
      reset({
        full_name: '',
        gender: '',
        class_id: '',
        parent_guardian_name: '',
        parent_guardian_phone: '',
        admission_status: 'Active',
      })
    }
  }, [open, student, reset])

  async function onSubmit(values: FormShape) {
    try {
      if (isEdit && student) {
        await updateStudent(student.id, values as StudentFormValues)
        toast.success('Student record updated.')
      } else {
        if (!activeYear) {
          toast.error('No active academic year is configured yet.')
          return
        }
        const student_number = await nextStudentNumber()
        await createStudent({ ...values, student_number, academic_year_id: activeYear.id } as StudentFormValues)
        toast.success(`Student added as ${student_number}.`)
      }
      queryClient.invalidateQueries({ queryKey: ['students'] })
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Student' : 'Add Student'}
      description={isEdit ? student?.student_number : undefined}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" {...register('full_name')} />
          {errors.full_name && <p className="mt-1 text-xs text-danger">{errors.full_name.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender" {...register('gender')}>
              <option value="">Not specified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="class_id">Class</Label>
            <Select id="class_id" {...register('class_id')}>
              <option value="">Select class</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name}
                </option>
              ))}
            </Select>
            {errors.class_id && <p className="mt-1 text-xs text-danger">{errors.class_id.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="parent_guardian_name">Parent/Guardian name</Label>
            <Input id="parent_guardian_name" {...register('parent_guardian_name')} />
          </div>
          <div>
            <Label htmlFor="parent_guardian_phone">Parent/Guardian phone</Label>
            <Input id="parent_guardian_phone" placeholder="0244123456" {...register('parent_guardian_phone')} />
            {errors.parent_guardian_phone && (
              <p className="mt-1 text-xs text-danger">{errors.parent_guardian_phone.message}</p>
            )}
          </div>
        </div>

        {isEdit && (
          <div>
            <Label htmlFor="admission_status">Admission status</Label>
            <Select id="admission_status" {...register('admission_status')}>
              <option value="Active">Active</option>
              <option value="Transferred">Transferred</option>
              <option value="Graduated">Graduated</option>
              <option value="Withdrawn">Withdrawn</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Student'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
