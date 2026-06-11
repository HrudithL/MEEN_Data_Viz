'use client'

import { useState } from 'react'
import { useAppRouter } from '@/components/motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useAppRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  async function signIn(emailValue: string, passwordValue: string) {
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email && user.email !== emailValue) {
      await supabase.auth.signOut()
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard', 'Loading dashboard…')
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await signIn(email, password)
  }

  return (
    <div className="glass rounded-2xl p-8">
      <h2 className="text-xl font-semibold text-foreground mb-6">Sign in to your account</h2>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground/80 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground input-glow focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground/80 mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground input-glow focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive animate-slide-down">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={async () => {
              if (!email.trim()) {
                setError('Enter your email to reset password')
                return
              }
              setError(null)
              setResetMessage(null)
              setLoading(true)
              const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/login`,
              })
              setLoading(false)
              if (resetError) setError(resetError.message)
              else setResetMessage('Password reset email sent. Check your inbox.')
            }}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {resetMessage && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-400">
            {resetMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-snappy glow-sm interactive active:scale-[0.98]"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-primary hover:text-primary/80 transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  )
}
