import * as React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export function LoginPage() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [resetSent, setResetSent] = React.useState(false)

  if (!loading && user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      setError('Incorrect email or password. Please try again.')
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setError('Enter your email above first, then tap "Forgot password".')
      return
    }
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) {
      setError('Could not send the reset link. Please contact the administrator.')
    } else {
      setResetSent(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-xl font-bold text-white">
            IGF
          </div>
          <h1 className="text-lg font-semibold text-foreground">NKY. METH. JHS IGF Tracker</h1>
          <p className="mt-1 text-sm text-muted">Nyankyerenease Methodist JHS — Internally Generated Funds</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@nkymethjhs.edu.gh"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            {resetSent && (
              <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                A password reset link has been sent to your email.
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>

            <button
              type="button"
              onClick={handleResetPassword}
              className="w-full text-center text-sm text-brand-700 hover:underline"
            >
              Forgot password?
            </button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          Having trouble signing in? Contact your school administrator.
        </p>
      </div>
    </div>
  )
}
