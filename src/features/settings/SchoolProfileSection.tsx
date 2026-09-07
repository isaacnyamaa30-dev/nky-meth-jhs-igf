import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { useToast, friendlyError } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { getSetting, updateSetting, type SchoolProfile } from '@/services/settings'
import { PageLoader } from '@/components/ui/spinner'

const DEFAULTS: SchoolProfile = {
  school_name: '',
  application_name: '',
  address: '',
  phone: '',
  currency: 'GHS',
  receipt_footer: '',
}

export function SchoolProfileSection() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['setting', 'school_profile'],
    queryFn: () => getSetting<SchoolProfile>('school_profile'),
  })

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<SchoolProfile>({ defaultValues: DEFAULTS })

  React.useEffect(() => {
    if (profile) reset(profile)
  }, [profile, reset])

  async function onSubmit(values: SchoolProfile) {
    if (!user) return
    try {
      await updateSetting('school_profile', { ...values }, user.id)
      toast.success('School profile updated.')
      queryClient.invalidateQueries({ queryKey: ['setting', 'school_profile'] })
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Profile</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PageLoader />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="school_name">School name</Label>
                <Input id="school_name" {...register('school_name')} />
              </div>
              <div>
                <Label htmlFor="application_name">Application name</Label>
                <Input id="application_name" {...register('application_name')} />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" {...register('currency')} />
              </div>
            </div>
            <div>
              <Label htmlFor="receipt_footer">Receipt footer</Label>
              <Textarea id="receipt_footer" rows={2} {...register('receipt_footer')} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
