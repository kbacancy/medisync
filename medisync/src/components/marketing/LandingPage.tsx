'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, Video, Pill, Calendar, BarChart3, Shield, Play,
  Menu, X, TrendingUp, Zap, Activity, Lock, UserCheck,
  ClipboardList, FileText, Check, ArrowRight,
} from 'lucide-react'

// ─── Static data ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    span: 2,
    iconBg: '#E8F5F0', iconColor: '#0A7B5C', Icon: Users,
    title: 'Patient 360° View',
    description: 'Unified patient timeline with vitals, history, prescriptions, and risk scores — everything your care team needs in a single view.',
  },
  {
    span: 1,
    iconBg: '#EBF5FF', iconColor: '#3B82F6', Icon: Video,
    title: 'Telehealth Built-In',
    description: 'HD video visits, screen sharing, and e-prescribing without leaving the platform.',
  },
  {
    span: 1,
    iconBg: '#F3E8FF', iconColor: '#7C3AED', Icon: Pill,
    title: 'Medication Adherence',
    description: 'AI-powered PDC tracking with automated outreach and refill reminders.',
  },
  {
    span: 1,
    iconBg: '#FEF3C7', iconColor: '#D97706', Icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Intelligent appointment booking that reduces no-shows by 40%.',
  },
  {
    span: 1,
    iconBg: '#ECFDF5', iconColor: '#16A34A', Icon: BarChart3,
    title: 'Clinical Analytics',
    description: 'Real-time population health dashboards and outcome reporting.',
  },
  {
    span: 2,
    iconBg: '#FFF1F0', iconColor: '#F43F5E', Icon: Shield,
    title: 'Enterprise Security',
    description: 'HIPAA, SOC 2 Type II, HL7 FHIR integration, and SSO out of the box. Every byte encrypted, every action audited.',
  },
]

const CLINICS = ['Stanford Health', 'Mayo Clinic', 'Cleveland Clinic', 'Johns Hopkins', 'UCSF Health', 'Mass General', 'NYU Langone', 'Cedars-Sinai']

const PATIENTS = [
  { initials: 'SM', name: 'Sarah M.', pdc: 88, status: 'On track', statusColor: '#0A7B5C', statusBg: '#E8F5F0', avatarBg: '#E8F5F0' },
  { initials: 'RK', name: 'Robert K.', pdc: 72, status: 'At risk', statusColor: '#D97706', statusBg: '#FEF3C7', avatarBg: '#EBF5FF' },
  { initials: 'EV', name: 'Elena V.', pdc: 95, status: 'Excellent', statusColor: '#16A34A', statusBg: '#ECFDF5', avatarBg: '#F3E8FF' },
]

const CLINICIANS = [
  { initials: 'JL', name: 'Dr. James', role: 'Cardiologist', bg: '#E8F5F0' },
  { initials: 'MR', name: 'Dr. Maria', role: 'Internist', bg: '#EBF5FF' },
  { initials: 'KP', name: 'Dr. Kevin', role: 'Neurologist', bg: '#F3E8FF' },
  { initials: 'AC', name: 'Dr. Anna', role: 'Oncologist', bg: '#FEF3C7' },
  { initials: 'OA', name: 'Dr. Omar', role: 'Pulmonologist', bg: '#ECFDF5' },
  { initials: 'LW', name: 'Dr. Lisa', role: 'Hospitalist', bg: '#FFF1F0' },
  { initials: 'PS', name: 'Dr. Priya', role: 'Endocrinologist', bg: '#E8F5F0' },
  { initials: 'CM', name: 'Dr. Chris', role: 'Geriatrician', bg: '#EBF5FF' },
]

const BAR_DATA = [60, 72, 65, 80, 74, 85, 78, 90, 83, 88, 79, 94]

const SECURITY_ITEMS = [
  { Icon: Shield,      iconBg: '#E8F5F0', iconColor: '#0A7B5C', title: 'HIPAA Compliant',      description: 'Full HIPAA Privacy and Security Rule compliance with built-in PHI safeguards.' },
  { Icon: Lock,        iconBg: '#EBF5FF', iconColor: '#3B82F6', title: '256-bit Encryption',   description: 'AES-256 encryption at rest and in transit, with per-tenant key isolation.' },
  { Icon: FileText,    iconBg: '#F3E8FF', iconColor: '#7C3AED', title: 'BAA Included',          description: 'Business Associate Agreement included with every plan — zero legal friction.' },
  { Icon: UserCheck,   iconBg: '#FEF3C7', iconColor: '#D97706', title: 'Role-Based Access',    description: 'Granular permissions for clinicians, coordinators, and admins via row-level security.' },
  { Icon: ClipboardList,iconBg:'#ECFDF5', iconColor: '#16A34A', title: 'Immutable Audit Logs', description: 'Tamper-proof audit trails for every action — HIPAA compliance and breach investigation.' },
  { Icon: Activity,    iconBg: '#FFF1F0', iconColor: '#F43F5E', title: '99.9% Uptime SLA',     description: 'Enterprise SLA with real-time monitoring, automatic failover, and 24/7 response.' },
]

const PLANS = [
  {
    name: 'Starter', price: '$199', period: '/mo', badge: null as string | null, highlight: false,
    tagline: 'For small practices and independent clinicians.',
    features: ['Up to 3 clinicians', '500 patient records', 'Medication adherence tracking', 'Basic analytics dashboard', 'Email support'],
    cta: 'Start free trial', href: '/register',
  },
  {
    name: 'Professional', price: '$499', period: '/mo', badge: 'Most popular' as string | null, highlight: true,
    tagline: 'The full platform for growing clinics.',
    features: ['Up to 15 clinicians', 'Unlimited patient records', 'Telehealth video visits', 'AI-powered PDC engine', 'Smart scheduling', 'Priority support'],
    cta: 'Start free trial', href: '/register',
  },
  {
    name: 'Enterprise', price: 'Custom', period: '', badge: null as string | null, highlight: false,
    tagline: 'For health systems that need scale and compliance.',
    features: ['Unlimited clinicians', 'Unlimited patient records', 'HL7 FHIR integration', 'SSO & custom auth', 'Dedicated CSM', 'BAA & MSA included'],
    cta: 'Contact sales', href: '#enterprise',
  },
]

// ─── Logo ─────────────────────────────────────────────────────────────────────

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect width="20" height="20" rx="5" fill="#0A7B5C" />
      <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.08)',
      background: '#F8FAFC',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 32px 80px rgba(0,0,0,0.12)',
    }}>
      {/* Browser chrome */}
      <div style={{
        height: 40, background: 'white',
        display: 'flex', alignItems: 'center', paddingLeft: 16, gap: 6,
        borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0,
      }}>
        {['#FC8181', '#F6E05E', '#68D391'].map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
        ))}
        <div style={{
          marginLeft: 12, height: 22, flex: 1, maxWidth: 260,
          background: '#F1F5F9', borderRadius: 6,
          display: 'flex', alignItems: 'center', paddingLeft: 10,
          fontSize: 10, color: '#94A3B8', gap: 5,
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <Activity size={9} color="#94A3B8" />
          app.medisync.health/dashboard
        </div>
      </div>

      <div style={{ display: 'flex', height: 340 }}>
        {/* Sidebar */}
        <div style={{
          width: 52, background: 'white',
          borderRight: '1px solid rgba(0,0,0,0.05)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', paddingTop: 16, gap: 6, flexShrink: 0,
        }}>
          {[Users, Video, Pill, Calendar, BarChart3].map((Icon, i) => (
            <div key={i} style={{
              width: 34, height: 34, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i === 0 ? '#E8F5F0' : 'transparent',
              transition: 'background 0.15s',
            }}>
              <Icon size={14} color={i === 0 ? '#0A7B5C' : '#CBD5E1'} />
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, overflow: 'hidden' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Total Patients', value: '2,847', color: '#0A7B5C' },
              { label: 'Today', value: '142', color: '#3B82F6' },
              { label: 'PDC Avg', value: '82%', color: '#16A34A' },
              { label: 'Alerts', value: '3', color: '#D97706' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'white', borderRadius: 8,
                padding: '8px 10px', border: '1px solid rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: 'white', borderRadius: 8, padding: 10, border: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#0F1117' }}>Adherence Rate (30d)</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#0A7B5C' }}>↑ 94%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 44 }}>
              {BAR_DATA.map((h, i) => (
                <div key={i} style={{
                  flex: 1, height: `${h}%`,
                  background: i === BAR_DATA.length - 1 ? '#0A7B5C' : `rgba(10,123,92,${0.1 + (i / BAR_DATA.length) * 0.3})`,
                  borderRadius: '2px 2px 0 0',
                }} />
              ))}
            </div>
          </div>

          {/* Patients */}
          <div style={{ background: 'white', borderRadius: 8, padding: 10, border: '1px solid rgba(0,0,0,0.05)', flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#0F1117', marginBottom: 8 }}>Recent Patients</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {PATIENTS.map(({ initials, name, pdc, status, statusColor, statusBg, avatarBg }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: avatarBg,
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 700, color: '#6B7280',
                  }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 500, color: '#0F1117' }}>{name}</div>
                    <div style={{ fontSize: 8, color: '#9CA3AF' }}>PDC: {pdc}%</div>
                  </div>
                  <div style={{
                    fontSize: 8, padding: '2px 7px', borderRadius: 4,
                    background: statusBg, color: statusColor, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>{status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section header helper ────────────────────────────────────────────────────

function SectionHeader({ badge, title, sub, center = true }: { badge?: string; title: string; sub: string; center?: boolean }) {
  return (
    <div data-reveal style={{ textAlign: center ? 'center' : 'left', marginBottom: 56 }}>
      {badge && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 999,
          background: 'rgba(10,123,92,0.08)', border: '0.5px solid rgba(10,123,92,0.2)',
          marginBottom: 16,
        }}>
          <Shield size={11} color="#0A7B5C" />
          <span style={{ fontSize: 12, color: '#0A7B5C', fontWeight: 500, letterSpacing: '0.02em' }}>{badge}</span>
        </div>
      )}
      <h2 style={{
        fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700,
        color: '#0F1117', letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.15,
      }}>{title}</h2>
      <p style={{ fontSize: 17, color: '#6B7280', maxWidth: center ? 480 : '100%', margin: center ? '0 auto' : 0, lineHeight: 1.6 }}>{sub}</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    )
    els.forEach((el) => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(24px)'
      const delay = el.dataset.revealDelay ?? '0'
      el.style.transition = `opacity 0.55s cubic-bezier(.22,1,.36,1) ${delay}s, transform 0.55s cubic-bezier(.22,1,.36,1) ${delay}s`
      observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ fontFamily: 'var(--font-sans)', background: '#FFFFFF', minHeight: '100vh', color: '#0F1117' }}>

      {/* ── Global styles ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes ms-pulse-dot {
          0%,100% { transform: scale(1); opacity: 1; }
          60%      { transform: scale(1.6); opacity: 0; }
        }
        @keyframes ms-float-a { from { transform: translateY(0px); }  to { transform: translateY(-7px); } }
        @keyframes ms-float-b { from { transform: translateY(-3px); } to { transform: translateY(-10px); } }
        @keyframes ms-float-c { from { transform: translateY(-1px); } to { transform: translateY(-8px); } }
        @keyframes ms-marquee  { from { transform: translateX(0); }    to { transform: translateX(-50%); } }

        .ms-chip-a { animation: ms-float-a 3s   ease-in-out 0s   infinite alternate; }
        .ms-chip-b { animation: ms-float-b 3.4s ease-in-out 0.5s infinite alternate; }
        .ms-chip-c { animation: ms-float-c 2.8s ease-in-out 1s   infinite alternate; }
        .ms-marquee-track { animation: ms-marquee 28s linear infinite; display: flex; width: max-content; }

        .ms-feature-card { transition: transform 0.22s cubic-bezier(.22,1,.36,1), box-shadow 0.22s ease !important; }
        .ms-feature-card:hover { transform: translateY(-5px) !important; box-shadow: 0 20px 48px rgba(0,0,0,0.1) !important; }

        .ms-nav-link { transition: color 0.15s ease; text-decoration: none; }
        .ms-nav-link:hover { color: #0F1117; }
        .ms-footer-link { transition: color 0.15s ease; text-decoration: none; }
        .ms-footer-link:hover { color: #0F1117; }

        @media (max-width: 768px) {
          .ms-nav-center { display: none !important; }
          .ms-hamburger   { display: flex !important; }
          .ms-chips       { display: none !important; }
        }
        @media (min-width: 769px) {
          .ms-hamburger { display: none !important; }
        }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', inset: '0 0 auto 0', zIndex: 50, height: 64,
        display: 'flex', alignItems: 'center', padding: '0 24px',
        background: scrolled ? 'rgba(255,255,255,0.88)' : 'white',
        backdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        borderBottom: `0.5px solid ${scrolled ? 'rgba(0,0,0,0.07)' : 'transparent'}`,
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}>
        <div style={{ maxWidth: 1120, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
            <LogoMark />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F1117', lineHeight: 1, letterSpacing: '-0.3px' }}>MediSync</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1, marginTop: 2 }}>Health System</div>
            </div>
          </Link>

          <div className="ms-nav-center" style={{ display: 'flex', gap: 32, flex: 1, justifyContent: 'center' }}>
            {['Features', 'Security', 'Pricing', 'Enterprise'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="ms-nav-link"
                style={{ fontSize: 14, color: '#6B7280', letterSpacing: '-0.1px' }}>
                {item}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <Link href="/login" className="ms-nav-link" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link href="/register" style={{
              height: 36, padding: '0 16px', borderRadius: 8,
              background: '#0A7B5C', color: 'white', fontSize: 14, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(10,123,92,0.3)',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#086648' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0A7B5C' }}
            >
              Get started
            </Link>
            <button className="ms-hamburger" onClick={() => setMenuOpen((o) => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#0F1117' }}
              aria-label="Toggle navigation">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, background: 'white', zIndex: 49,
          padding: '16px 24px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {['Features', 'Security', 'Pricing', 'Enterprise'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}
              className="ms-nav-link" style={{ fontSize: 15, color: '#6B7280', padding: '8px 0', display: 'block' }}>
              {item}
            </a>
          ))}
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 168, paddingBottom: 0, textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'white' }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(10,123,92,0.09) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 90% 80% at 50% 0%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 0%, black 30%, transparent 100%)',
        }} />
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 500, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(10,123,92,0.08) 0%, transparent 65%)',
        }} />

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          {/* Trust pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px', borderRadius: 999, marginBottom: 28,
            background: 'rgba(10,123,92,0.07)', border: '0.5px solid rgba(10,123,92,0.2)',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', background: '#0A7B5C', flexShrink: 0,
              animation: 'ms-pulse-dot 1.8s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, color: '#0A7B5C', fontWeight: 500, letterSpacing: '0.02em' }}>
              HIPAA Compliant · SOC 2 Type II Certified
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.04,
            letterSpacing: '-0.04em', color: '#0F1117', maxWidth: 780, margin: '0 auto 22px',
          }}>
            Clinical intelligence<br />
            <span style={{
              background: 'linear-gradient(135deg, #0A7B5C 0%, #16A34A 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              for modern care teams
            </span>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 19, color: '#6B7280', lineHeight: 1.65, maxWidth: 520, margin: '0 auto',
            letterSpacing: '-0.01em',
          }}>
            MediSync unifies patient management, telehealth, and AI medication adherence — one HIPAA-compliant platform trusted by 500+ clinics.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
            <Link href="/register" style={{
              height: 50, padding: '0 28px', borderRadius: 12,
              background: '#0A7B5C', color: 'white', fontSize: 15, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(10,123,92,0.35), 0 8px 24px rgba(10,123,92,0.22)',
              transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#086648'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(10,123,92,0.35), 0 14px 32px rgba(10,123,92,0.28)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0A7B5C'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(10,123,92,0.35), 0 8px 24px rgba(10,123,92,0.22)'
              }}>
              Start free trial <ArrowRight size={15} />
            </Link>
            <button style={{
              height: 50, padding: '0 24px', borderRadius: 12,
              background: 'white', border: '1px solid rgba(0,0,0,0.12)',
              color: '#0F1117', fontSize: 15, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.2)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.12)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}>
              <Play size={13} fill="#0F1117" strokeWidth={0} />
              Watch 2-min demo
            </button>
          </div>

          <p style={{ marginTop: 14, fontSize: 12, color: '#B0B7C3', letterSpacing: '0.01em' }}>
            No credit card required · Free 14-day trial · Cancel anytime
          </p>

          {/* Mockup + glow */}
          <div style={{ position: 'relative', maxWidth: 900, margin: '60px auto 0' }}>
            {/* Ambient glow */}
            <div style={{
              position: 'absolute', bottom: -60, left: '50%', transform: 'translateX(-50%)',
              width: '65%', height: 100,
              background: 'radial-gradient(ellipse, rgba(10,123,92,0.3) 0%, transparent 70%)',
              filter: 'blur(24px)', zIndex: 0, pointerEvents: 'none',
            }} />

            {/* Perspective wrapper */}
            <div className="ms-chips" style={{ transform: 'perspective(2800px) rotateX(9deg)', transformOrigin: 'center top', position: 'relative', zIndex: 1 }}>
              <DashboardMockup />
            </div>

            {/* Floating chips */}
            <div className="ms-chip-a ms-chips" style={{
              position: 'absolute', top: 68, left: -20,
              background: 'white', border: '0.5px solid rgba(0,0,0,0.08)',
              borderRadius: 10, padding: '9px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
              zIndex: 2,
            }}>
              <TrendingUp size={13} color="#0A7B5C" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F1117' }}>↑ 34% PDC improvement</span>
            </div>

            <div className="ms-chip-b ms-chips" style={{
              position: 'absolute', top: 160, right: -20,
              background: 'white', border: '0.5px solid rgba(0,0,0,0.08)',
              borderRadius: 10, padding: '9px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
              zIndex: 2,
            }}>
              <Zap size={13} color="#3B82F6" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F1117' }}>2.4s avg load time</span>
            </div>

            <div className="ms-chip-c ms-chips" style={{
              position: 'absolute', bottom: 72, left: -20,
              background: 'white', border: '0.5px solid rgba(0,0,0,0.08)',
              borderRadius: 10, padding: '9px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
              zIndex: 2,
            }}>
              <Activity size={13} color="#16A34A" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F1117' }}>99.9% uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR (marquee) ───────────────────────────────────────────── */}
      <section style={{
        padding: '36px 0', borderTop: '0.5px solid rgba(0,0,0,0.06)',
        borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#FAFAFA', overflow: 'hidden',
      }}>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#B0B7C3', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
          Trusted by leading health systems
        </p>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 100,
            background: 'linear-gradient(to right, #FAFAFA, transparent)', zIndex: 2, pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 100,
            background: 'linear-gradient(to left, #FAFAFA, transparent)', zIndex: 2, pointerEvents: 'none',
          }} />
          <div className="ms-marquee-track">
            {[...CLINICS, ...CLINICS].map((name, i) => (
              <span key={i} style={{
                fontSize: 14, fontWeight: 600, color: '#CBD5E1',
                letterSpacing: '0.01em', whiteSpace: 'nowrap', padding: '0 40px',
              }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES (bento) ─────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '96px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <SectionHeader
            title="Everything your clinic needs"
            sub="Built for clinicians, not administrators. Every feature designed around how care teams actually work."
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {/* Row 1: large (span-2) + regular */}
            {FEATURES.slice(0, 2).map(({ span, iconBg, iconColor, Icon, title, description }, i) => (
              <div
                key={title}
                data-reveal
                data-reveal-delay={String(i * 0.08)}
                className="ms-feature-card"
                style={{
                  gridColumn: `span ${span}`,
                  background: 'white', border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: 16, padding: 28,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column',
                  minHeight: span === 2 ? 200 : 'auto',
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={21} color={iconColor} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F1117', margin: '18px 0 8px', letterSpacing: '-0.2px' }}>
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.65, margin: 0, flex: 1 }}>{description}</p>
                <div style={{ marginTop: 20 }}>
                  <a href="#" className="ms-nav-link" style={{
                    fontSize: 13, color: '#0A7B5C', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    Learn more <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            ))}

            {/* Row 2: 3 equal */}
            {FEATURES.slice(2, 5).map(({ iconBg, iconColor, Icon, title, description }, i) => (
              <div
                key={title}
                data-reveal
                data-reveal-delay={String((i + 2) * 0.08)}
                className="ms-feature-card"
                style={{
                  background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 16, padding: 24,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 11,
                  background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={19} color={iconColor} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F1117', margin: '14px 0 6px', letterSpacing: '-0.1px' }}>
                  {title}
                </h3>
                <p style={{ fontSize: 13.5, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>{description}</p>
              </div>
            ))}

            {/* Row 3: wide (span-2) + regular */}
            {FEATURES.slice(5).map(({ span, Icon, title, description }, i) => (
              <div
                key={title}
                data-reveal
                data-reveal-delay={String((i + 5) * 0.08)}
                className="ms-feature-card"
                style={{
                  gridColumn: `span ${span}`,
                  background: '#0A7B5C', border: 'none',
                  borderRadius: 16, padding: 28,
                  boxShadow: '0 8px 32px rgba(10,123,92,0.2)',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={21} color="white" />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'white', margin: '18px 0 8px', letterSpacing: '-0.2px' }}>
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, margin: 0, flex: 1 }}>{description}</p>
                <div style={{ marginTop: 20 }}>
                  <a href="#" style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none',
                  }}>
                    Learn more <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY ─────────────────────────────────────────────────────── */}
      <section id="security" style={{ padding: '96px 24px', background: '#F8F9FB' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 64, alignItems: 'start' }}>

            {/* Left: headline */}
            <div data-reveal>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 999, marginBottom: 20,
                background: 'rgba(10,123,92,0.08)', border: '0.5px solid rgba(10,123,92,0.2)',
              }}>
                <Shield size={11} color="#0A7B5C" />
                <span style={{ fontSize: 12, color: '#0A7B5C', fontWeight: 500 }}>Enterprise-grade</span>
              </div>
              <h2 style={{
                fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700,
                color: '#0F1117', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16,
              }}>
                Security you can stake your practice on
              </h2>
              <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.65, marginBottom: 32 }}>
                Built to meet the strictest healthcare compliance requirements — right out of the box, no extra configuration.
              </p>
              {/* Compliance badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {['HIPAA', 'SOC 2 Type II', 'HL7 FHIR', 'AES-256', 'BAA Included'].map((badge) => (
                  <div key={badge} style={{
                    padding: '6px 14px', borderRadius: 999,
                    background: 'white', border: '1px solid rgba(0,0,0,0.08)',
                    fontSize: 12, fontWeight: 600, color: '#374151',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                    ✓ {badge}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {SECURITY_ITEMS.map(({ Icon, iconBg, iconColor, title, description }, i) => (
                <div
                  key={title}
                  data-reveal
                  data-reveal-delay={String(i * 0.06)}
                  className="ms-feature-card"
                  style={{
                    background: 'white', border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: 14, padding: 20,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Icon size={17} color={iconColor} />
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F1117', marginBottom: 5, letterSpacing: '-0.1px' }}>{title}</h3>
                  <p style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.55, margin: 0 }}>{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', background: 'white' }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 72, alignItems: 'center',
        }}>
          <div data-reveal>
            <div style={{ fontSize: 22, color: '#0A7B5C', marginBottom: 24 }}>✦</div>
            <blockquote style={{
              fontSize: 22, fontWeight: 400, color: '#0F1117', lineHeight: 1.6,
              fontStyle: 'italic', margin: '0 0 20px', letterSpacing: '-0.01em',
            }}>
              "MediSync reduced our administrative overhead by 60%. Our clinicians spend more time with patients, less time on paperwork."
            </blockquote>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#E8F5F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#0A7B5C',
              }}>SC</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0F1117' }}>Dr. Sarah Chen, CMO</div>
                <div style={{ fontSize: 13, color: '#9CA3AF' }}>Stanford Health</div>
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
              marginTop: 40, borderTop: '0.5px solid rgba(0,0,0,0.07)', paddingTop: 32,
            }}>
              {[{ number: '500+', label: 'clinics' }, { number: '2.1M', label: 'patients managed' }, { number: '77%', label: 'avg PDC lift' }].map(({ number, label }) => (
                <div key={label}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#0A7B5C', letterSpacing: '-0.03em', lineHeight: 1 }}>{number}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 5, lineHeight: 1.4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal data-reveal-delay="0.12">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {CLINICIANS.map(({ initials, name, role, bg }) => (
                <div key={name} style={{ background: bg, borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 7px', fontSize: 12, fontWeight: 700, color: '#374151',
                  }}>{initials}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: '#0F1117' }}>{name}</div>
                  <div style={{ fontSize: 8.5, color: '#9CA3AF', marginTop: 1 }}>{role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '96px 24px', background: '#F8F9FB' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <SectionHeader
            title="Simple, transparent pricing"
            sub="Start free for 14 days. No credit card required. Upgrade anytime."
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'stretch' }}>
            {PLANS.map(({ name, price, period, badge, highlight, tagline, features, cta, href }, i) => (
              <div
                key={name}
                data-reveal
                data-reveal-delay={String(i * 0.08)}
                style={{
                  background: highlight ? '#0A7B5C' : 'white',
                  border: highlight ? 'none' : '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 20, padding: 32,
                  boxShadow: highlight
                    ? '0 20px 64px rgba(10,123,92,0.28), 0 4px 16px rgba(10,123,92,0.15)'
                    : '0 1px 4px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
                }}
              >
                {badge && (
                  <div style={{
                    position: 'absolute', top: 18, right: 18,
                    background: 'rgba(255,255,255,0.2)', color: 'white',
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                  }}>{badge}</div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: highlight ? 'rgba(255,255,255,0.6)' : '#9CA3AF', marginBottom: 10,
                  }}>{name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 44, fontWeight: 800, color: highlight ? 'white' : '#0F1117', letterSpacing: '-0.04em', lineHeight: 1 }}>{price}</span>
                    {period && <span style={{ fontSize: 16, color: highlight ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>{period}</span>}
                  </div>
                  <p style={{ fontSize: 14, color: highlight ? 'rgba(255,255,255,0.68)' : '#6B7280', marginTop: 8, lineHeight: 1.5 }}>{tagline}</p>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 28 }}>
                  {features.map((feature) => (
                    <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        background: highlight ? 'rgba(255,255,255,0.2)' : '#E8F5F0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={10} color={highlight ? 'white' : '#0A7B5C'} strokeWidth={2.5} />
                      </div>
                      <span style={{ fontSize: 14, color: highlight ? 'rgba(255,255,255,0.88)' : '#374151' }}>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href={href} style={{
                  height: 46, borderRadius: 12,
                  background: highlight ? 'white' : '#0A7B5C',
                  color: highlight ? '#0A7B5C' : 'white',
                  fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >{cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section id="enterprise" style={{ padding: '96px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Dark gradient bg */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #031E14 0%, #0A4030 45%, #0D6045 100%)',
        }} />
        {/* Dot grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700, height: 300, pointerEvents: 'none',
          background: 'radial-gradient(ellipse, rgba(10,200,120,0.12) 0%, transparent 65%)',
        }} />

        <div style={{ maxWidth: 1120, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 data-reveal style={{
            fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 800,
            color: 'white', letterSpacing: '-0.04em', marginBottom: 16, lineHeight: 1.1,
          }}>
            Ready to modernize your clinic?
          </h2>
          <p style={{
            fontSize: 18, color: 'rgba(255,255,255,0.65)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.65,
          }}>
            Join 500+ health systems using MediSync to deliver better patient outcomes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{
              height: 50, padding: '0 28px', borderRadius: 12,
              background: 'white', color: '#0A7B5C', fontSize: 15, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,255,255,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Start free trial <ArrowRight size={15} />
            </Link>
            <button style={{
              height: 50, padding: '0 28px', borderRadius: 12,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
              color: 'white', fontSize: 15, fontWeight: 500, cursor: 'pointer',
              transition: 'border-color 0.15s, transform 0.15s',
            }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.65)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              Contact sales
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ padding: '60px 24px 40px', background: 'white', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 40, marginBottom: 52 }}>
            {[
              { heading: 'Product', links: ['Features', 'Telehealth', 'Medication Tracking', 'Analytics', 'Integrations'] },
              { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Partners'] },
              { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'HIPAA Notice', 'Cookie Policy', 'BAA Agreement'] },
              { heading: 'Connect', links: ['Twitter / X', 'LinkedIn', 'GitHub', 'Status', 'Support'] },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0F1117', marginBottom: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {heading}
                </div>
                {links.map((link) => (
                  <div key={link} style={{ marginBottom: 10 }}>
                    <a href="#" className="ms-footer-link" style={{ fontSize: 14, color: '#6B7280' }}>{link}</a>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '0.5px solid rgba(0,0,0,0.06)', paddingTop: 24, flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LogoMark />
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>© 2026 MediSync Health System</span>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy', 'Terms', 'HIPAA Notice'].map((item) => (
                <a key={item} href="#" className="ms-footer-link" style={{ fontSize: 13, color: '#B0B7C3' }}>{item}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
