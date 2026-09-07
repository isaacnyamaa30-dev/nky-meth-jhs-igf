import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { listActiveClasses } from '@/services/classes'
import { createStaff, nextStaffNumber, updateStaff, type StaffFormValues, type StaffWithClass } from '@/services/staff'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required'),
  gender: z.union([z.literal(''), z.literal('Male'), z.literal('Female'), z.literal('Other')]),
  phone_number: z
    .string()
    .trim()
    .refine((v) => !v || /^(0\d{9}|\+233\d{9})$/.test(v), 'Enter a valid Ghanaian number, e.g. 0244123456'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]),
  job_title: z.string().trim(),
  assigned_class_id: z.string(),
  user_role: z.enum(['admin', 'headteacher', 'accounts', 'teacher']),
  date_joined: z.string().min(1, 'Date joined is required'),
  profile_id: z
    .string()
    .trim()
    .refine((v) => !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), 'Must be a valid User ID (UUID) or left blank'),
})

type FormShape = z.infer<typeof schema>

export function StaffFormDialog({
  open,
  onOpenChange,
  staff,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff?: StaffWithClass | null
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEdit = !!staff

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
      phone_number: '',
      email: '',
      job_title: '',
      assigned_class_id: '',
      user_role: 'teacher',
      date_joined: new Date().toISOString().slice(0, 10),
      profile_id: '',
    },
  })

  React.useEffect(() => {
    if (!open) return
    if (staff) {
      reset({
        full_name: staff.full_name,
        gender: (staff.gender ?? '') as FormShape['gender'],
        phone_number: staff.phone_number ?? '',
        email: staff.email ?? '',
        job_title: staff.job_title ?? '',
        assigned_class_id: staff.assigned_class_id ?? '',
        user_role: staff.user_role,
        date_joined: staff.date_joined,
        profile_id: staff.profile_id ?? '',
      })
    } else {
      reset({
        full_name: '',
        gender: '',
        phone_number: '',
        email: '',
        job_title: '',
        assigned_class_id: '',
        user_role: 'teacher',
        date_joined: new Date().toISOString().slice(0, 10),
        profile_id: '',
      })
    }
  }, [open, staff, reset])

  async function onSubmit(values: FormShape) {
    try {
      if (isEdit && staff) {
        await updateStaff(staff.id, values as StaffFormValues)
        toast.success('Staff record updated.')
      } else {
        const staff_number = await nextStaffNumber()
        await createStaff({ ...values, staff_number } as StaffFormValues)
        toast.success(`Staff added as ${staff_number}.`)
      }
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Staff' : 'Add Staff'}
      description={isEdit ? staff?.staff_number : 'Creates a personnel record for this staff member.'}
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
            <Label htmlFor="date_joined">Date joined</Label>
            <Input id="date_joined" type="date" {...register('date_joined')} />
            {errors.date_joined && <p className="mt-1 text-xs text-danger">{errors.date_joined.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone_number">Phone number</Label>
            <Input id="phone_number" placeholder="0244123456" {...register('phone_number')} />
            {errors.phone_number && <p className="mt-1 text-xs text-danger">{errors.phone_number.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="job_title">Job title</Label>
          <Input id="job_title" placeholder="e.g. Class Teacher" {...register('job_title')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="user_role">System role</Label>
            <Select id="user_role" {...register('user_role')}>
              <option value="teacher">Teacher / Collector</option>
              <option value="accounts">Accounts / IGF Officer</option>
              <option value="headteacher">Headteacher</option>
              <option value="admin">Administrator</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="assigned_class_id">Assigned class</Label>
            <Select id="assigned_class_id" {...register('assigned_class_id')}>
              <option value="">None</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="profile_id">Login Account ID (optional)</Label>
          <Input id="profile_id" placeholder="Paste the User ID from Authentication → Users" {...register('profile_id')} />
          <p className="mt-1 text-xs text-muted">
            Leave blank until this person has a login account. Link it later by editing this record once you've
            created their account under Authentication → Users in Supabase.
          </p>
          {errors.profile_id && <p className="mt-1 text-xs text-danger">{errors.profile_id.message}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Staff'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
