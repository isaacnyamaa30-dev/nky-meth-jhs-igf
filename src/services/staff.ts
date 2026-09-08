import { supabase } from '@/lib/supabase'
import type { Staff, StaffStatus, UserRole } from '@/types/domain'

export interface StaffWithClass extends Staff {
  classes: { class_name: string } | null
}

export async function listStaff(): Promise<StaffWithClass[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*, classes:assigned_class_id(class_name)')
    .order('full_name')
  if (error) throw error
  return data as unknown as StaffWithClass[]
}

export async function nextStaffNumber(): Promise<string> {
  const { data, error } = await supabase
    .from('staff')
    .select('staff_number')
    .order('staff_number', { ascending: false })
    .limit(1)
  if (error) throw error
  const last = data?.[0]?.staff_number as string | undefined
  const lastNum = last ? parseInt(last.replace(/\D/g, ''), 10) : 0
  return `STF-${String(lastNum + 1).padStart(4, '0')}`
}

export interface StaffFormValues {
  staff_number: string
  full_name: string
  gender: 'Male' | 'Female' | 'Other' | ''
  phone_number: string
  email: string
  job_title: string
  assigned_class_id: string
  user_role: UserRole
  date_joined: string
  profile_id: string
}

export async function createStaff(values: StaffFormValues) {
  const { error } = await supabase.from('staff').insert({
    staff_number: values.staff_number,
    full_name: values.full_name,
    gender: values.gender || null,
    phone_number: values.phone_number || null,
    email: values.email || null,
    job_title: values.job_title || null,
    assigned_class_id: values.assigned_class_id || null,
    user_role: values.user_role,
    date_joined: values.date_joined,
    profile_id: values.profile_id || null,
  })
  if (error) throw error
}

export async function updateStaff(id: string, values: StaffFormValues) {
  const { error } = await supabase
    .from('staff')
    .update({
      full_name: values.full_name,
      gender: values.gender || null,
      phone_number: values.phone_number || null,
      email: values.email || null,
      job_title: values.job_title || null,
      assigned_class_id: values.assigned_class_id || null,
      user_role: values.user_role,
      date_joined: values.date_joined,
      profile_id: values.profile_id || null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function setStaffStatus(id: string, status: StaffStatus) {
  const { error } = await supabase.from('staff').update({ status }).eq('id', id)
  if (error) throw error
}

export interface InviteStaffInput {
  full_name: string
  email: string
  user_role: UserRole
  job_title?: string
}

export interface InviteStaffResult {
  success?: boolean
  error?: string
  staff_number?: string
}

/**
 * Creates a real login account for a new staff member via the invite-staff
 * Edge Function - the service_role key it needs stays server-side and is
 * never present in this frontend bundle.
 */
export async function inviteStaff(input: InviteStaffInput): Promise<InviteStaffResult> {
  const { data, error } = await supabase.functions.invoke('invite-staff', { body: input })
  if (error) {
    // Supabase's FunctionsHttpError wraps the response; try to surface the
    // function's own JSON error message rather than a generic network error.
    const context = (error as { context?: Response }).context
    if (context) {
      try {
        const body = await context.json()
        return { error: body.error ?? error.message }
      } catch {
        // fall through to generic message below
      }
    }
    return { error: error.message }
  }
  return data as InviteStaffResult
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
  if (error) throw error
}
