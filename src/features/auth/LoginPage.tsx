import * as React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Footer } from '@/components/layout/Footer'

export function LoginPage() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <img
              src="/logo.png"
              alt="Nyankyerenease Methodist JHS crest"
              className="mx-auto mb-3 h-20 w-20 rounded-full object-cover shadow-lg ring-4 ring-gold-400/70"
            />
            <h1 className="text-xl font-semibold text-white">NKY. METH. JHS IGF Tracker</h1>
            <p className="mt-1 text-sm text-brand-100/80">Nyankyerenease Methodist JHS — Internally Generated Funds</p>
          </div>

          <Card className="border-t-4 border-t-gold-400 bg-gold-100 p-6 shadow-xl">
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
                  className="border-gold-300 bg-gold-50"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
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

          <p className="mt-6 text-center text-xs text-brand-100/70">
            Having trouble signing in? Contact your school administrator.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
