"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

// Public registration creates patient accounts only.
// Clinician accounts are provisioned by an administrator via /api/patients/create.
const ROLE = "patient" as const

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: ROLE } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, email, full_name: fullName, role: ROLE })
    }

    window.location.replace("/medications")
  }

  const inputStyle: React.CSSProperties = {
    height: 36,
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

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--ms-page)' }}
    >
      {/* Logo lockup */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: '#1A7A5E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: 'white', fontSize: 22, fontWeight: 600, userSelect: 'none', letterSpacing: '-0.5px' }}>M</span>
        </div>
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
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--ms-text-primary)', letterSpacing: '-0.2px', marginBottom: 4 }}>
          Create account
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ms-text-secondary)', marginBottom: 24 }}>
          Fill in your details to get started
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <label htmlFor="full-name" style={labelStyle}>Full name</label>
            <input
              id="full-name"
              type="text"
              placeholder="Dr. Jane Smith"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

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
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
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
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 15, color: 'var(--ms-text-secondary)', textAlign: 'center' }}>
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: '#1A7A5E', fontWeight: 500, textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
