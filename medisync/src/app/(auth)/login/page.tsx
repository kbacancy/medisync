"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

type Mode = 'signin' | 'forgot'

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')
  const [resetSent, setResetSent] = useState(false)

  const inputStyle: React.CSSProperties = {
    height: 40,
    padding: '0 12px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    backgroundColor: 'white',
    fontSize: 15,
    color: 'var(--ms-text-primary)',
    outline: 'none',
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
    width: '100%',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--ms-text-secondary)',
    letterSpacing: '0.01em',
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#1A7A5E'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,122,94,0.15)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'
    e.currentTarget.style.boxShadow = ''
  }

  async function handleSignIn(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role ?? 'patient'
    const destination =
      role === 'clinician' || role === 'coordinator' ? '/dashboard' : '/medications'

    window.location.replace(destination)
  }

  async function handleForgotPassword(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setResetSent(true)
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(10,123,92,0.07) 0%, transparent 70%), var(--ms-page)',
      }}
    >
      {/* Back to home */}
      <div style={{ position: 'absolute', top: '20px', left: '24px' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#6B7280',
            textDecoration: 'none',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#0F1117' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
        >
          ← MediSync
        </Link>
      </div>

      {/* Logo lockup */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
          <rect width="52" height="52" rx="14" fill="#0A7B5C" />
          <path d="M26 12v28M12 26h28" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
        </svg>
        <p style={{ fontSize: 22, fontWeight: 500, color: 'var(--ms-text-primary)', letterSpacing: '-0.2px' }}>
          MediSync
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full"
        style={{
          maxWidth: 400,
          backgroundColor: 'white',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.08)',
          padding: 32,
        }}
      >
        {mode === 'forgot' ? (
          resetSent ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#E8F5F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 10l4.5 4.5L16 6" stroke="#0A7B5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--ms-text-primary)', marginBottom: 8 }}>
                Check your email
              </h1>
              <p style={{ fontSize: 14, color: 'var(--ms-text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                We sent a reset link to{' '}
                <strong style={{ color: 'var(--ms-text-primary)' }}>{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <button
                onClick={() => { setMode('signin'); setResetSent(false) }}
                style={{ fontSize: 14, color: '#1A7A5E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--ms-text-primary)', letterSpacing: '-0.2px', marginBottom: 4 }}>
                Reset password
              </h1>
              <p style={{ fontSize: 15, color: 'var(--ms-text-secondary)', marginBottom: 24 }}>
                Enter your email and we&apos;ll send a reset link.
              </p>

              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(220,38,38,0.06)',
                      border: '1px solid rgba(220,38,38,0.2)',
                      fontSize: 14,
                      color: '#B91C1C',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="email-reset" style={labelStyle}>Email</label>
                  <input
                    id="email-reset"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: 8,
                    width: '100%',
                    height: 44,
                    borderRadius: 8,
                    backgroundColor: loading ? 'rgba(26,122,94,0.6)' : '#1A7A5E',
                    color: 'white',
                    fontSize: 15,
                    fontWeight: 500,
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 120ms ease',
                  }}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p style={{ marginTop: 20, fontSize: 15, color: 'var(--ms-text-secondary)', textAlign: 'center' }}>
                <button
                  onClick={() => { setMode('signin'); setError(null) }}
                  style={{ color: '#1A7A5E', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}
                >
                  ← Back to sign in
                </button>
              </p>
            </>
          )
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--ms-text-primary)', letterSpacing: '-0.2px', marginBottom: 4 }}>
              Sign in
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ms-text-secondary)', marginBottom: 24 }}>
              Enter your credentials to access your account
            </p>

            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(220,38,38,0.06)',
                    border: '1px solid rgba(220,38,38,0.2)',
                    fontSize: 14,
                    color: '#B91C1C',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="email" style={labelStyle}>Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="password" style={labelStyle}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null) }}
                    style={{ fontSize: 12, color: '#1A7A5E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8,
                  width: '100%',
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: loading ? 'rgba(26,122,94,0.6)' : '#1A7A5E',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 500,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 120ms ease, transform 80ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#155F4A'
                }}
                onMouseLeave={(e) => {
                  if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#1A7A5E'
                }}
                onMouseDown={(e) => {
                  if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = ''
                }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p style={{ marginTop: 20, fontSize: 15, color: 'var(--ms-text-secondary)', textAlign: 'center' }}>
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                style={{ color: '#1A7A5E', fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
              >
                Register
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
