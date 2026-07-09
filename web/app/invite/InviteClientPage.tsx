'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthEnter, FadeIn } from '@/components/motion'

interface Props {
    token: string
    orgName: string
    role: string
    invitedEmail: string
    isAuthenticated: boolean
    currentUserEmail: string | null
}

export default function InviteClientPage({
    token,
    orgName,
    role,
    invitedEmail,
    isAuthenticated,
    currentUserEmail,
}: Props) {
    const router = useRouter()
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [email, setEmail] = useState(invitedEmail)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [accepted, setAccepted] = useState(false)

    async function acceptInvitation() {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/invitations/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        })
        const json = await res.json()
        if (!res.ok) {
            setError(json.error?.message ?? 'Failed to accept invitation')
            setLoading(false)
            return
        }
        setAccepted(true)
        setLoading(false)
    }

    async function handleAuthAndAccept(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        const supabase = createClient()

        if (mode === 'signup') {
            if (password !== confirmPassword) { setError('Passwords do not match'); return }
            if (password.length < 8) { setError('Password must be at least 8 characters'); return }
            setLoading(true)
            const { error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { display_name: displayName.trim() || null } },
            })
            if (authError) { setError(authError.message); setLoading(false); return }
        } else {
            setLoading(true)
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
            if (authError) { setError(authError.message); setLoading(false); return }
        }

        await acceptInvitation()
    }

    const inputClass = "w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground input-glow focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
    const btnClass = "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-snappy glow-sm interactive active:scale-[0.98]"
    const labelClass = "block text-sm font-medium text-foreground/80 mb-1.5"

    if (accepted) {
        return (
            <div className="min-h-screen flex items-center justify-center auth-bg px-4">
                <FadeIn className="glass rounded-2xl p-8 max-w-md w-full text-center animate-scale-in">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <span className="text-emerald-400 text-2xl">✓</span>
                    </div>
                    <h1 className="text-xl font-semibold text-foreground mb-2">Invitation accepted!</h1>
                    <p className="text-muted-foreground text-sm mb-6">
                        You&apos;ve joined <strong className="text-foreground">{orgName}</strong> as a{' '}
                        <span className="font-medium text-primary capitalize">{role}</span>.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all duration-200 ease-snappy glow-sm interactive active:scale-[0.98]"
                    >
                        Go to Dashboard
                    </Link>
                </FadeIn>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center auth-bg px-4 py-12">
            <AuthEnter className="w-full max-w-md space-y-4">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold gradient-text">M4 Data Viz</h1>
                </div>

                {/* Invite banner */}
                <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
                    <p className="text-sm text-foreground/80">
                        You&apos;ve been invited to join{' '}
                        <strong className="text-foreground">{orgName}</strong> as a{' '}
                        <span className="font-medium text-primary capitalize">{role}</span>.
                    </p>
                </div>

                {isAuthenticated ? (
                    <div className="glass rounded-2xl p-8 text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                            Signed in as <strong className="text-foreground">{currentUserEmail}</strong>
                        </p>
                        {error && (
                            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                                {error}
                            </div>
                        )}
                        <button
                            onClick={acceptInvitation}
                            disabled={loading}
                            className={btnClass}
                        >
                            {loading ? 'Accepting...' : `Accept invitation to ${orgName}`}
                        </button>
                    </div>
                ) : (
                    <div className="glass rounded-2xl p-8">
                        {/* Mode tabs */}
                        <div className="flex border-b border-border/50 mb-6">
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 pb-2.5 text-sm font-medium border-b-2 transition-all duration-200 ease-snappy interactive active:scale-[0.99] ${
                                    mode === 'login'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Sign in
                            </button>
                            <button
                                onClick={() => setMode('signup')}
                                className={`flex-1 pb-2.5 text-sm font-medium border-b-2 transition-all duration-200 ease-snappy interactive active:scale-[0.99] ${
                                    mode === 'signup'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Create account
                            </button>
                        </div>

                        <form onSubmit={handleAuthAndAccept} className="space-y-4">
                            {mode === 'signup' && (
                                <div>
                                    <label className={labelClass}>
                                        Display name <span className="text-muted-foreground font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className={inputClass}
                                        placeholder="Dr. Jane Smith"
                                    />
                                </div>
                            )}

                            <div>
                                <label className={labelClass}>Email address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={inputClass}
                                    placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                                />
                            </div>

                            {mode === 'signup' && (
                                <div>
                                    <label className={labelClass}>Confirm password</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={inputClass}
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            {error && (
                                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive animate-slide-down">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={btnClass}
                            >
                                {loading
                                    ? 'Please wait...'
                                    : mode === 'login'
                                        ? 'Sign in & accept invitation'
                                        : 'Create account & accept invitation'}
                            </button>
                        </form>
                    </div>
                )}
            </AuthEnter>
        </div>
    )
}
