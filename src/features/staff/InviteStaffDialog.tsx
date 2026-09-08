import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { inviteStaff } from '@/services/staff'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  user_role: z.enum(['admin', 'headteacher', 'accounts', 'teacher']),
  job_title: z.string().trim(),
})
type FormShape = z.infer<typeof schema>

export function InviteStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormShape>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', user_role: 'teacher', job_title: '' },
  })

  async function onSubmit(values: FormShape) {
    const result = await inviteStaff(values)
    if (result.error) {
      toast.error(friendlyError(new Error(result.error)))
      return
    }
    toast.success(`Invite sent to ${values.email} (${result.staff_number}). They'll set their own password by email.`)
    queryClient.invalidateQueries({ queryKey: ['staff'] })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite Staff / Admin"
      description="Creates their staff record and emails them a link to set their own password."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="invite-full-name">Full name</Label>
          <Input id="invite-full-name" {...register('full_name')} />
          {errors.full_name && <p className="mt-1 text-xs text-danger">{errors.full_name.message}</p>}
        </div>
        <div>
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" type="email" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="invite-role">System role</Label>
            <Select id="invite-role" {...register('user_role')}>
              <option value="teacher">Teacher / Collector</option>
              <option value="accounts">Accounts / IGF Officer</option>
              <option value="headteacher">Headteacher</option>
              <option value="admin">Administrator</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="invite-job-title">Job title</Label>
            <Input id="invite-job-title" placeholder="e.g. Class Teacher" {...register('job_title')} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending invite…' : 'Send Invite'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
