import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Footer } from '@/components/layout/Footer'
import { PageLoader } from '@/components/ui/spinner'

/**
 * Reached from the emailed "reset password" link. Supabase's client detects
 * the recovery token in the URL automatically and establishes a session, so
 * this page just needs to wait for that, then let the user set a new
 * password via supabase.auth.updateUser - the missing half of the
 * "Forgot password?" flow on the login page, which only sent the email.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = React.useState(true)
  const [hasRecoverySession, setHasRecoverySession] = React.useState(false)
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  React.useEffect(() => {
    let active = true

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setHasRecoverySession(true)
        setChecking(false)
      }
    })

    // In case the recovery event already fired before this component mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session) setHasRecoverySession(true)
      setChecking(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (error) {
      setError('Could not update your password. Please try the reset link again.')
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <img
              src="/logo.png"
              alt="Nyankyerenease Methodist JHS crest"
              className="mx-auto mb-3 h-20 w-20 rounded-full object-cover shadow-lg ring-4 ring-gold-400/70"
            />
            <h1 className="text-xl font-semibold text-white">Reset Your Password</h1>
            <p className="mt-1 text-sm text-brand-100/80">NKY. METH. JHS IGF Tracker</p>
          </div>

          <Card className="border-t-4 border-t-gold-400 bg-gold-100 p-6 shadow-xl">
            {checking ? (
              <PageLoader />
            ) : success ? (
              <div className="space-y-4 text-center">
                <p className="text-sm font-medium text-brand-800">
                  Your password has been updated. You're signed in — continue to the dashboard.
                </p>
                <Button size="lg" className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
                  Continue to Dashboard
                </Button>
              </div>
            ) : !hasRecoverySession ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-danger">
                  This reset link is invalid or has expired. Go back to the login page and request a new one.
                </p>
                <Button size="lg" className="w-full" onClick={() => navigate('/login', { replace: true })}>
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-gold-300 bg-gold-50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-brand-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-gold-300 bg-gold-50"
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? 'Updating…' : 'Set New Password'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}
