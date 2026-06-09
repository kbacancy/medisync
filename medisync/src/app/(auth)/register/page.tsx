"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Stethoscope, User, TrendingUp, Activity, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const PREVIEW_PATIENTS = [
  { initials: 'SM', name: 'Sarah M.', role: 'Hypertension', pdc: 88, statusColor: '#0A7B5C', statusBg: '#E8F5F0', label: 'On track', avatarBg: '#C6E9DE' },
  { initials: 'RK', name: 'Robert K.', role: 'Diabetes T2', pdc: 72, statusColor: '#D97706', statusBg: '#FEF3C7', label: 'At risk', avatarBg: '#BFDBFE' },
  { initials: 'EV', name: 'Elena V.', role: 'Asthma', pdc: 95, statusColor: '#16A34A', statusBg: '#DCFCE7', label: 'Excellent', avatarBg: '#DDD6FE' },
  { initials: 'JD', name: 'James D.', role: 'COPD', pdc: 61, statusColor: '#DC2626', statusBg: '#FEE2E2', label: 'Critical', avatarBg: '#FED7AA' },
]

const BAR_HEIGHTS = [48, 60, 52, 72, 64, 80, 70, 88, 76, 84, 72, 96]

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<"clinician" | "patient">("clinician")
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
      options: { data: { full_name: fullName, role } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
      })
    }

    window.location.replace(role === "patient" ? "/medications" : "/dashboard")
  }

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

  const ROLES = [
    { id: 'clinician' as const, label: 'Clinician', sub: 'Doctor / Nurse', Icon: Stethoscope },
    { id: 'patient' as const, label: 'Patient', sub: 'Personal health', Icon: User },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── Left panel ─────────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex"
        style={{
          width: '55%',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 56px',
          background: 'linear-gradient(145deg, #042D1E 0%, #0A5C43 50%, #0D7A5A 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 30% 60%, rgba(10,180,120,0.12) 0%, transparent 70%)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <svg width="34" height="34" viewBox="0 0 52 52" fill="none" aria-hidden="true">
            <rect width="52" height="52" rx="14" fill="rgba(255,255,255,0.15)" />
            <path d="M26 12v28M12 26h28" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'white', letterSpacing: '-0.2px' }}>MediSync</span>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: 'white', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 12 }}>
            Your entire clinic,<br />in one place.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 340 }}>
            Real-time medication adherence, telehealth, and patient insights — built for modern care teams.
          </p>
        </div>

        {/* Dashboard preview card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          maxWidth: 420,
        }}>
          {/* Card header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F1117' }}>Patient Adherence</span>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#0A7B5C',
              backgroundColor: '#E8F5F0',
              padding: '3px 8px',
              borderRadius: 20,
            }}>Live</span>
          </div>

          {/* Stat row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}>
            {[
              { Icon: TrendingUp, iconColor: '#0A7B5C', iconBg: '#E8F5F0', value: '87%', label: 'Avg PDC' },
              { Icon: Users, iconColor: '#3B82F6', iconBg: '#EBF5FF', value: '2,847', label: 'Patients' },
              { Icon: Activity, iconColor: '#7C3AED', iconBg: '#F3E8FF', value: '+12', label: 'Today' },
            ].map(({ Icon, iconColor, iconBg, value, label }) => (
              <div key={label} style={{ padding: '12px 14px', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 6,
                }}>
                  <Icon size={13} color={iconColor} strokeWidth={2.5} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F1117', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Mini bar chart */}
          <div style={{ padding: '12px 18px 8px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
              {BAR_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    borderRadius: '3px 3px 0 0',
                    backgroundColor: i === BAR_HEIGHTS.length - 1 ? '#0A7B5C' : 'rgba(10,123,92,0.18)',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: '#D1D5DB' }}>Jan</span>
              <span style={{ fontSize: 10, color: '#D1D5DB' }}>Dec</span>
            </div>
          </div>

          {/* Patient list */}
          <div style={{ padding: '4px 0 0' }}>
            {PREVIEW_PATIENTS.map((p, i) => (
              <div
                key={p.initials}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 18px',
                  borderBottom: i < PREVIEW_PATIENTS.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  backgroundColor: p.avatarBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#374151', flexShrink: 0,
                }}>
                  {p.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0F1117', lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{p.role}</div>
                </div>
                {/* PDC bar */}
                <div style={{ width: 60 }}>
                  <div style={{ height: 4, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${p.pdc}%`, height: '100%', backgroundColor: p.statusColor, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280', textAlign: 'right', marginTop: 2 }}>{p.pdc}%</div>
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: p.statusColor,
                  backgroundColor: p.statusBg,
                  padding: '2px 7px',
                  borderRadius: 20,
                  whiteSpace: 'nowrap',
                }}>
                  {p.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust line */}
        <p style={{ marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.01em' }}>
          Trusted by <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>500+</span> clinics including Stanford Health, Mayo Clinic &amp; UCSF.
        </p>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
          background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(10,123,92,0.06) 0%, transparent 60%), var(--ms-page)',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Back link */}
        <div style={{ position: 'absolute', top: '20px', left: '24px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: '#6B7280', textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#0F1117' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
          >
            ← MediSync
          </Link>
        </div>

        {/* Logo (shown only on mobile where left panel is hidden) */}
        <div className="flex lg:hidden flex-col items-center gap-3 mb-8">
          <svg width="48" height="48" viewBox="0 0 52 52" fill="none" aria-hidden="true">
            <rect width="52" height="52" rx="14" fill="#0A7B5C" />
            <path d="M26 12v28M12 26h28" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
          </svg>
          <p style={{ fontSize: 20, fontWeight: 500, color: 'var(--ms-text-primary)', letterSpacing: '-0.2px' }}>MediSync</p>
        </div>

        {/* Card */}
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: 'white',
            borderRadius: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.08)',
            padding: 32,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--ms-text-primary)', letterSpacing: '-0.2px', marginBottom: 4 }}>
            Create your account
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ms-text-secondary)', marginBottom: 24 }}>
            Join MediSync to manage your health and care.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                backgroundColor: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
                fontSize: 14, color: '#B91C1C',
              }}>
                {error}
              </div>
            )}

            {/* Role selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={labelStyle}>I am a</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {ROLES.map(({ id, label, sub, Icon }) => {
                  const active = role === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRole(id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        padding: '14px 12px', borderRadius: 10, cursor: 'pointer',
                        border: active ? '2px solid #1A7A5E' : '1.5px solid rgba(0,0,0,0.10)',
                        backgroundColor: active ? 'rgba(26,122,94,0.05)' : 'white',
                        boxShadow: active ? '0 0 0 3px rgba(26,122,94,0.12)' : 'none',
                        transition: 'border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: active ? 'rgba(26,122,94,0.10)' : 'rgba(0,0,0,0.04)',
                        transition: 'background-color 120ms ease',
                      }}>
                        <Icon size={17} color={active ? '#1A7A5E' : '#9CA3AF'} strokeWidth={2} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#1A7A5E' : 'var(--ms-text-primary)', lineHeight: 1.3 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 11, color: active ? 'rgba(26,122,94,0.7)' : '#9CA3AF', marginTop: 2, lineHeight: 1.3 }}>
                          {sub}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="full-name" style={labelStyle}>Full name</label>
              <input
                id="full-name"
                type="text"
                placeholder={role === 'clinician' ? 'Dr. Jane Smith' : 'Jane Smith'}
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
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                    color: '#9CA3AF', display: 'flex', alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8, width: '100%', height: 44, borderRadius: 8,
                backgroundColor: loading ? 'rgba(26,122,94,0.6)' : '#1A7A5E',
                color: 'white', fontSize: 15, fontWeight: 500, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 120ms ease, transform 80ms ease',
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#155F4A' }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#1A7A5E' }}
              onMouseDown={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)' }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = '' }}
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

          <p style={{ marginTop: 16, fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6 }}>
            By creating an account you agree to our{' '}
            <a href="#" style={{ color: '#6B7280', textDecoration: 'underline' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" style={{ color: '#6B7280', textDecoration: 'underline' }}>Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
