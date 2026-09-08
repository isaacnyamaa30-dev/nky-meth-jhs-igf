// Supabase Edge Function: invite-staff
//
// Lets an admin create a real login account for a new staff member without
// ever putting the service_role key in the browser. The key lives only in
// this function's server-side environment (SUPABASE_SERVICE_ROLE_KEY is
// auto-provided by Supabase for every Edge Function - never set by hand,
// never committed to the repo).
//
// Flow: admin submits {full_name, email, user_role, job_title?} from the
// app -> this function verifies the CALLER is really an admin (using their
// own JWT, not trusting the client) -> creates the staff HR record ->
// invites the email via Supabase Auth (sends them a "set your password"
// email using the same /reset-password page already built for password
// recovery) -> links the new auth account to the staff record.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_ROLES = ['admin', 'headteacher', 'accounts', 'teacher']

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // 1. Identify the caller from their own JWT - never trust a role claim
  // sent in the request body.
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser()

  if (callerError || !caller) {
    return json({ error: 'Not authenticated.' }, 401)
  }

  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle()

  if (profileError || callerProfile?.role !== 'admin') {
    return json({ error: 'Only administrators can invite staff.' }, 403)
  }

  // 2. Validate input.
  let payload: { full_name?: string; email?: string; user_role?: string; job_title?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid request body.' }, 400)
  }

  const full_name = payload.full_name?.trim()
  const email = payload.email?.trim().toLowerCase()
  const user_role = payload.user_role?.trim()
  const job_title = payload.job_title?.trim() || null

  if (!full_name || full_name.length < 2) return json({ error: 'Enter the staff member\'s full name.' }, 400)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400)
  if (!user_role || !VALID_ROLES.includes(user_role)) return json({ error: 'Select a valid role.' }, 400)

  // 3. Generate the next staff number (same scheme the app's own Staff page uses).
  const { data: lastStaff } = await adminClient
    .from('staff')
    .select('staff_number')
    .order('staff_number', { ascending: false })
    .limit(1)
  const lastNum = lastStaff?.[0]?.staff_number ? parseInt(lastStaff[0].staff_number.replace(/\D/g, ''), 10) : 0
  const staff_number = `STF-${String(lastNum + 1).padStart(4, '0')}`

  // 4. Invite the account. This creates the auth user (unconfirmed) and
  // emails them a link to the app's /reset-password page to set their own
  // password - the service_role key never leaves this function.
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://nky-meth-jhs-igf.vercel.app'
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role: user_role },
    redirectTo: `${siteUrl}/reset-password`,
  })

  if (inviteError || !invited?.user) {
    const message = inviteError?.message ?? 'Could not send the invite.'
    const friendly = message.toLowerCase().includes('already registered')
      ? 'A user with this email already exists.'
      : message
    return json({ error: friendly }, 400)
  }

  // 5. Create the staff HR record, linked to the new account.
  const { error: staffError } = await adminClient.from('staff').insert({
    staff_number,
    full_name,
    email,
    job_title,
    user_role,
    status: 'Active',
    date_joined: new Date().toISOString().slice(0, 10),
    profile_id: invited.user.id,
  })

  if (staffError) {
    // The auth account was created but the staff row failed (e.g. duplicate
    // email on staff) - surface this clearly so the admin can link manually
    // via the Staff page rather than silently losing the invite.
    return json(
      { error: `Invite sent, but the staff record could not be created automatically: ${staffError.message}` },
      207,
    )
  }

  return json({ success: true, staff_number, user_id: invited.user.id })
})
