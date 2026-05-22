'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Video,
  Pill,
  Calendar,
  BarChart3,
  Shield,
  Play,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  Zap,
  Activity,
} from 'lucide-react'

// ─── Static data ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    iconBg: '#E8F5F0',
    iconColor: '#0A7B5C',
    Icon: Users,
    title: 'Patient 360° View',
    description:
      'Unified patient timeline with vitals, history, prescriptions, and risk scores in one view.',
  },
  {
    iconBg: '#EBF5FF',
    iconColor: '#3B82F6',
    Icon: Video,
    title: 'Telehealth Built-In',
    description:
      'HD video visits, screen sharing, and e-prescribing without leaving the platform.',
  },
  {
    iconBg: '#F3E8FF',
    iconColor: '#7C3AED',
    Icon: Pill,
    title: 'Medication Adherence',
    description:
      'AI-powered PDC tracking with automated outreach and refill reminders.',
  },
  {
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    Icon: Calendar,
    title: 'Smart Scheduling',
    description:
      'Intelligent appointment booking that reduces no-shows by 40%.',
  },
  {
    iconBg: '#ECFDF5',
    iconColor: '#16A34A',
    Icon: BarChart3,
    title: 'Clinical Analytics',
    description:
      'Real-time population health dashboards and outcome reporting.',
  },
  {
    iconBg: '#FFF1F0',
    iconColor: '#F43F5E',
    Icon: Shield,
    title: 'Enterprise Security',
    description:
      'HIPAA, SOC 2 Type II, HL7 FHIR integration, and SSO out of the box.',
  },
] as const

const CLINICS = [
  'Stanford Health',
  'Mayo Clinic',
  'Cleveland Clinic',
  'Johns Hopkins',
  'UCSF Health',
  'Mass General',
]

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

// ─── Logo ─────────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect width="20" height="20" rx="5" fill="#0A7B5C" />
      <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Hero dashboard mockup ────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        background: '#F8FAFC',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          height: '38px',
          background: '#EEF2F7',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '14px',
          gap: '6px',
          borderBottom: '1px solid #E2E8F0',
          flexShrink: 0,
        }}
      >
        {['#FC8181', '#F6E05E', '#68D391'].map((c) => (
          <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
        ))}
        <div
          style={{
            marginLeft: '10px',
            height: '20px',
            flex: 1,
            maxWidth: '240px',
            background: 'white',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '8px',
            fontSize: '10px',
            color: '#94A3B8',
            border: '1px solid #E2E8F0',
            gap: '4px',
          }}
        >
          <Activity size={9} color="#94A3B8" />
          app.medisync.health/dashboard
        </div>
      </div>

      {/* Dashboard body */}
      <div style={{ display: 'flex', height: '340px' }}>
        {/* Sidebar */}
        <div
          style={{
            width: '48px',
            background: 'white',
            borderRight: '1px solid #F0F4F8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '14px',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          {[Users, Video, Pill, Calendar, BarChart3].map((Icon, i) => (
            <div
              key={i}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: i === 0 ? '#E8F5F0' : 'transparent',
              }}
            >
              <Icon size={14} color={i === 0 ? '#0A7B5C' : '#CBD5E1'} />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            padding: '14px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: 0,
          }}
        >
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { label: 'Total Patients', value: '2,847', color: '#0A7B5C' },
              { label: 'Today', value: '142', color: '#3B82F6' },
              { label: 'PDC Avg', value: '82%', color: '#16A34A' },
              { label: 'Alerts', value: '3', color: '#D97706' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  background: 'white',
                  borderRadius: '7px',
                  padding: '8px 10px',
                  border: '1px solid #F0F4F8',
                }}
              >
                <div style={{ fontSize: '9px', color: '#9CA3AF', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: 'white', borderRadius: '7px', padding: '10px', border: '1px solid #F0F4F8', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 600, color: '#0F1117' }}>Adherence Rate (30d)</div>
              <div style={{ fontSize: '9px', fontWeight: 600, color: '#0A7B5C' }}>↑ 94%</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '44px' }}>
              {BAR_DATA.map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background:
                      i === BAR_DATA.length - 1
                        ? '#0A7B5C'
                        : `rgba(10,123,92,${0.1 + (i / BAR_DATA.length) * 0.3})`,
                    borderRadius: '2px 2px 0 0',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Patient list */}
          <div style={{ background: 'white', borderRadius: '7px', padding: '10px', border: '1px solid #F0F4F8', flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '9px', fontWeight: 600, color: '#0F1117', marginBottom: '8px' }}>Recent Patients</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {PATIENTS.map(({ initials, name, pdc, status, statusColor, statusBg, avatarBg }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: avatarBg,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '7px',
                      fontWeight: 700,
                      color: '#6B7280',
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: 500, color: '#0F1117' }}>{name}</div>
                    <div style={{ fontSize: '8px', color: '#9CA3AF' }}>PDC: {pdc}%</div>
                  </div>
                  <div
                    style={{
                      fontSize: '8px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: statusBg,
                      color: statusColor,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
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

  // Scroll reveal via IntersectionObserver on [data-reveal] elements
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
      el.style.transform = 'translateY(20px)'
      const delay = el.dataset.revealDelay ?? '0'
      el.style.transition = `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`
      observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ fontFamily: 'var(--font-sans)', background: '#FAFAFA', minHeight: '100vh' }}>
      {/* ── Keyframe declarations ────────────────────────────────────────── */}
      <style>{`
        @keyframes ms-pulse-dot {
          0%,100% { transform: scale(1); opacity: 1; }
          60%      { transform: scale(1.5); opacity: 0; }
        }
        @keyframes ms-float-a {
          from { transform: translateY(0px);  }
          to   { transform: translateY(-6px); }
        }
        @keyframes ms-float-b {
          from { transform: translateY(-3px); }
          to   { transform: translateY(-9px); }
        }
        @keyframes ms-float-c {
          from { transform: translateY(-1px); }
          to   { transform: translateY(-7px); }
        }
        .ms-chip-a { animation: ms-float-a 3s   ease-in-out 0s   infinite alternate; }
        .ms-chip-b { animation: ms-float-b 3.4s ease-in-out 0.5s infinite alternate; }
        .ms-chip-c { animation: ms-float-c 2.8s ease-in-out 1s   infinite alternate; }
        .ms-feature-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        .ms-feature-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 16px 40px rgba(0,0,0,0.1) !important;
        }
        .ms-nav-link { transition: color 0.15s ease; text-decoration: none; }
        .ms-nav-link:hover { color: #0F1117; }
        .ms-footer-link { transition: color 0.15s ease; text-decoration: none; }
        .ms-footer-link:hover { color: #0F1117; }
        @media (max-width: 768px) {
          .ms-nav-center { display: none !important; }
          .ms-hamburger   { display: flex !important; }
          .ms-chip-a, .ms-chip-b, .ms-chip-c { display: none !important; }
        }
        @media (min-width: 769px) {
          .ms-hamburger { display: none !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          inset: '0 0 auto 0',
          zIndex: 50,
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: scrolled ? 'rgba(255,255,255,0.85)' : 'white',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: `0.5px solid ${scrolled ? 'rgba(0,0,0,0.06)' : 'transparent'}`,
          transition: 'background 0.2s ease, border-color 0.2s ease, backdrop-filter 0.2s ease',
        }}
      >
        <div style={{ maxWidth: '1120px', width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          {/* Logomark */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
            <LogoMark />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F1117', lineHeight: 1 }}>MediSync</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: 1, marginTop: '2px' }}>Health System</div>
            </div>
          </Link>

          {/* Center links */}
          <div
            className="ms-nav-center"
            style={{ display: 'flex', gap: '32px', flex: 1, justifyContent: 'center' }}
          >
            {['Features', 'Security', 'Pricing', 'Enterprise'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="ms-nav-link"
                style={{ fontSize: '14px', color: '#6B7280' }}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            <Link href="/login" className="ms-nav-link" style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link
              href="/register"
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                background: '#0A7B5C',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                transition: 'background 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#086648')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#0A7B5C')}
            >
              Get started
            </Link>
            <button
              className="ms-hamburger"
              onClick={() => setMenuOpen((o) => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#0F1117' }}
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            background: 'white',
            zIndex: 49,
            padding: '16px 24px 20px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {['Features', 'Security', 'Pricing', 'Enterprise'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setMenuOpen(false)}
              className="ms-nav-link"
              style={{ fontSize: '15px', color: '#6B7280', padding: '8px 0', display: 'block' }}
            >
              {item}
            </a>
          ))}
        </div>
      )}

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: '184px', paddingBottom: '96px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px' }}>
          {/* Trust pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: '#E8F5F0',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#0A7B5C',
                flexShrink: 0,
                animation: 'ms-pulse-dot 1.5s ease-in-out infinite',
              }}
            />
            <span style={{ fontSize: '12px', color: '#0A7B5C', fontWeight: 500, letterSpacing: '0.01em' }}>
              HIPAA Compliant · SOC 2 Certified
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#0F1117',
              maxWidth: '720px',
              margin: '0 auto 20px',
            }}
          >
            Clinical intelligence
            <br />
            for modern healthcare teams
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: '20px',
              fontWeight: 400,
              color: '#6B7280',
              lineHeight: 1.6,
              maxWidth: '560px',
              margin: '0 auto',
            }}
          >
            MediSync unifies patient management, telehealth, and medication adherence in one
            HIPAA-compliant platform trusted by 500+ clinics.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '32px',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/register"
              style={{
                height: '48px',
                padding: '0 24px',
                borderRadius: '10px',
                background: '#0A7B5C',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                transition: 'background 0.15s ease, transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#086648'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0A7B5C'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Start free trial
            </Link>
            <button
              style={{
                height: '48px',
                padding: '0 24px',
                borderRadius: '10px',
                background: 'white',
                border: '1px solid rgba(0,0,0,0.12)',
                color: '#0F1117',
                fontSize: '15px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.22)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <Play size={14} fill="#0F1117" strokeWidth={0} />
              Watch 2-min demo
            </button>
          </div>

          {/* Social proof note */}
          <p style={{ marginTop: '14px', fontSize: '12px', color: '#9CA3AF' }}>
            No credit card required · Free 14-day trial · Cancel anytime
          </p>

          {/* Hero visual + floating chips */}
          <div style={{ position: 'relative', maxWidth: '860px', margin: '48px auto 0' }}>
            <DashboardMockup />

            {/* Chip — PDC improvement */}
            <div
              className="ms-chip-a"
              style={{
                position: 'absolute',
                top: '72px',
                left: '-24px',
                background: 'white',
                border: '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: '8px',
                padding: '8px 12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <TrendingUp size={13} color="#0A7B5C" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F1117' }}>↑ 34% PDC improvement</span>
            </div>

            {/* Chip — load time */}
            <div
              className="ms-chip-b"
              style={{
                position: 'absolute',
                top: '148px',
                right: '-24px',
                background: 'white',
                border: '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: '8px',
                padding: '8px 12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Zap size={13} color="#3B82F6" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F1117' }}>2.4s avg load time</span>
            </div>

            {/* Chip — uptime */}
            <div
              className="ms-chip-c"
              style={{
                position: 'absolute',
                bottom: '56px',
                left: '-24px',
                background: 'white',
                border: '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: '8px',
                padding: '8px 12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Activity size={13} color="#16A34A" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F1117' }}>99.9% uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ───────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '48px 24px',
          background: '#F9FAFB',
          borderTop: '0.5px solid rgba(0,0,0,0.06)',
          borderBottom: '0.5px solid rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ maxWidth: '1120px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '24px', letterSpacing: '0.02em' }}>
            Trusted by leading health systems
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '24px 48px' }}>
            {CLINICS.map((name) => (
              <span key={name} style={{ fontSize: '14px', fontWeight: 500, color: '#CBD5E1', letterSpacing: '0.02em' }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '96px 24px', background: 'white' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div data-reveal style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 700, color: '#0F1117', letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Everything your clinic needs
            </h2>
            <p style={{ fontSize: '16px', color: '#6B7280' }}>Built for clinicians, not administrators.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {FEATURES.map(({ iconBg, iconColor, Icon, title, description }, i) => (
              <div
                key={title}
                data-reveal
                data-reveal-delay={String(i * 0.07)}
                className="ms-feature-card"
                style={{
                  background: 'white',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '12px',
                  padding: '28px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} color={iconColor} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F1117', margin: '16px 0 8px' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
                  {description}
                </p>
                <div style={{ marginTop: '20px' }}>
                  <a
                    href="#"
                    className="ms-nav-link"
                    style={{
                      fontSize: '13px',
                      color: '#0A7B5C',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontWeight: 500,
                    }}
                  >
                    Learn more <ChevronRight size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', background: '#F9FAFB' }}>
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '64px',
            alignItems: 'center',
          }}
        >
          {/* Quote + stats */}
          <div data-reveal>
            <div style={{ fontSize: '24px', marginBottom: '24px', color: '#0A7B5C' }}>✦</div>
            <blockquote
              style={{
                fontSize: '20px',
                fontWeight: 400,
                color: '#0F1117',
                lineHeight: 1.65,
                fontStyle: 'italic',
                margin: '0 0 20px',
              }}
            >
              "MediSync reduced our administrative overhead by 60%. Our clinicians spend more time
              with patients, less time on paperwork."
            </blockquote>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
              Dr. Sarah Chen, CMO ·{' '}
              <span style={{ fontWeight: 500, color: '#0F1117' }}>Stanford Health</span>
            </p>

            {/* Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginTop: '40px',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                paddingTop: '32px',
              }}
            >
              {[
                { number: '500+', label: 'clinics' },
                { number: '2.1M', label: 'patients managed' },
                { number: '77%', label: 'avg PDC improvement' },
              ].map(({ number, label }) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: '#0A7B5C',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {number}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Clinician avatar grid */}
          <div data-reveal data-reveal-delay="0.15">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {CLINICIANS.map(({ initials, name, role, bg }) => (
                <div
                  key={name}
                  style={{ background: bg, borderRadius: '12px', padding: '12px', textAlign: 'center' }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.75)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#374151',
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 500, color: '#0F1117' }}>{name}</div>
                  <div style={{ fontSize: '8px', color: '#9CA3AF', marginTop: '1px' }}>{role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────────── */}
      <section id="enterprise" style={{ padding: '80px 24px', background: '#0A7B5C' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            data-reveal
            style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
            }}
          >
            Ready to modernize your clinic?
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.78)',
              maxWidth: '480px',
              margin: '0 auto 36px',
              lineHeight: 1.6,
            }}
          >
            Join 500+ health systems using MediSync to deliver better patient outcomes.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/register"
              style={{
                height: '48px',
                padding: '0 28px',
                borderRadius: '10px',
                background: 'white',
                color: '#0A7B5C',
                fontSize: '15px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Start free trial
            </Link>
            <button
              style={{
                height: '48px',
                padding: '0 28px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.4)',
                color: 'white',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.75)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Contact sales
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ padding: '56px 24px 40px', background: 'white', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          {/* 4-column grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '40px',
              marginBottom: '48px',
            }}
          >
            {[
              {
                heading: 'Product',
                links: ['Features', 'Telehealth', 'Medication Tracking', 'Analytics', 'Integrations'],
              },
              {
                heading: 'Company',
                links: ['About', 'Blog', 'Careers', 'Press', 'Partners'],
              },
              {
                heading: 'Legal',
                links: ['Privacy Policy', 'Terms of Service', 'HIPAA Notice', 'Cookie Policy', 'BAA Agreement'],
              },
              {
                heading: 'Connect',
                links: ['Twitter / X', 'LinkedIn', 'GitHub', 'Status', 'Support'],
              },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#0F1117',
                    marginBottom: '16px',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}
                >
                  {heading}
                </div>
                {links.map((link) => (
                  <div key={link} style={{ marginBottom: '10px' }}>
                    <a href="#" className="ms-footer-link" style={{ fontSize: '14px', color: '#6B7280' }}>
                      {link}
                    </a>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '0.5px solid rgba(0,0,0,0.06)',
              paddingTop: '24px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogoMark />
              <span style={{ fontSize: '14px', color: '#6B7280' }}>© 2025 MediSync Health System</span>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              {['Privacy', 'Terms', 'HIPAA Notice'].map((item) => (
                <a key={item} href="#" className="ms-footer-link" style={{ fontSize: '13px', color: '#9CA3AF' }}>
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
