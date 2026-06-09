'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MessageCircle, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react'
import { MessageDrawer } from '@/components/patients/MessageDrawer'
import type { RiskLevel } from '@/types'

export interface PatientTableRow {
  id: string
  full_name: string
  active_med_count: number
  pdc_score: number
  inventory_days: number
  risk_level: RiskLevel
}

interface Props {
  patients: PatientTableRow[]
}

type SortKey = 'full_name' | 'pdc_score' | 'risk_level'
type SortDir = 'asc' | 'desc'

const RISK_ORDER: Record<RiskLevel, number> = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 }

/* Six teal shades — hash picks one per name */
const TEAL_SHADES = [
  { bg: '#E8F5F1', fg: '#1A7A5E' },
  { bg: '#D0EDE5', fg: '#155F4A' },
  { bg: '#BAE4DA', fg: '#0E5241' },
  { bg: '#C8EDE3', fg: '#14694F' },
  { bg: '#D8F0E8', fg: '#1A7A5E' },
  { bg: '#E2F4EE', fg: '#177A5C' },
]

function avatarShade(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return TEAL_SHADES[Math.abs(h) % TEAL_SHADES.length]
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join('')
}

function pdcColor(score: number): string {
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#F59E0B'
  return '#EF4444'
}

function PDCBar({ score, mounted }: { score: number; mounted: boolean }) {
  const color = pdcColor(score)
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-full overflow-hidden shrink-0"
        style={{ width: 200, height: 6, backgroundColor: 'rgba(0,0,0,0.08)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: mounted ? `${Math.min(score, 100)}%` : '0%',
            backgroundColor: color,
            transition: 'width 600ms ease-out 100ms',
          }}
        />
      </div>
      <span style={{ fontSize: 14, fontWeight: 500, color, fontVariantNumeric: 'tabular-nums' }}>
        {score}%
      </span>
    </div>
  )
}

function InventoryBadge({ days }: { days: number }) {
  if (days <= 0) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500,
        padding: '3px 8px', borderRadius: 100, whiteSpace: 'nowrap',
        backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#B91C1C',
      }}>
        Refill overdue
      </span>
    )
  }
  if (days <= 5) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500,
        padding: '3px 8px', borderRadius: 100, whiteSpace: 'nowrap',
        backgroundColor: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', color: '#92400E',
      }}>
        Low supply (&le;5 days)
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500,
      padding: '3px 8px', borderRadius: 100, whiteSpace: 'nowrap',
      backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#065F46',
    }}>
      Optimal
    </span>
  )
}

function RiskPill({ risk }: { risk: RiskLevel }) {
  const styles: Record<RiskLevel, { bg: string; border: string; color: string }> = {
    CRITICAL: { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)', color: '#B91C1C' },
    HIGH:     { bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.2)',  color: '#92400E' },
    MODERATE: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', color: '#1D4ED8' },
    LOW:      { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', color: '#065F46' },
  }
  const labels: Record<RiskLevel, string> = { CRITICAL: 'Critical', HIGH: 'High', MODERATE: 'Moderate', LOW: 'Low' }
  const s = styles[risk]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500,
      padding: '3px 8px', borderRadius: 100, whiteSpace: 'nowrap',
      backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>
      {labels[risk]}
    </span>
  )
}

export function PatientsTable({ patients }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('risk_level')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [messagingPatient, setMessagingPatient] = useState<{ id: string; name: string } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const rows = q ? patients.filter((p) => p.full_name.toLowerCase().includes(q)) : [...patients]
    rows.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'full_name') cmp = a.full_name.localeCompare(b.full_name)
      else if (sortKey === 'pdc_score') cmp = a.pdc_score - b.pdc_score
      else if (sortKey === 'risk_level') cmp = RISK_ORDER[a.risk_level] - RISK_ORDER[b.risk_level]
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [patients, search, sortKey, sortDir])

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown style={{ width: 14, height: 14, color: 'var(--ms-text-tertiary)' }} />
    return sortDir === 'asc'
      ? <ArrowUp style={{ width: 14, height: 14, color: '#1A7A5E' }} />
      : <ArrowDown style={{ width: 14, height: 14, color: '#1A7A5E' }} />
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative" style={{ maxWidth: 320 }}>
        <Search
          style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 16, color: 'var(--ms-text-tertiary)',
          }}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients…"
          style={{
            width: '100%',
            height: 36,
            paddingLeft: 34,
            paddingRight: 12,
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.12)',
            backgroundColor: 'white',
            fontSize: 15,
            color: 'var(--ms-text-primary)',
            outline: 'none',
            transition: 'border-color 120ms ease, box-shadow 120ms ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#1A7A5E'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,122,94,0.15)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'
            e.currentTarget.style.boxShadow = ''
          }}
        />
      </div>

      {/* Table — no outer border, only inter-row dividers */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              <th className="px-5 py-3 text-left">
                <button
                  className="flex items-center gap-1.5"
                  style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ms-text-tertiary)' }}
                  onClick={() => toggleSort('full_name')}
                >
                  Patient <SortIcon col="full_name" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  className="flex items-center gap-1.5"
                  style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ms-text-tertiary)' }}
                  onClick={() => toggleSort('pdc_score')}
                >
                  PDC Score <SortIcon col="pdc_score" />
                </button>
              </th>
              <th className="px-4 py-3 text-left" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ms-text-tertiary)' }}>
                Inventory
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  className="flex items-center gap-1.5"
                  style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ms-text-tertiary)' }}
                  onClick={() => toggleSort('risk_level')}
                >
                  Risk <SortIcon col="risk_level" />
                </button>
              </th>
              <th className="px-4 py-3 text-right" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ms-text-tertiary)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-16">
                    <Search style={{ width: 48, height: 48, color: 'var(--ms-text-tertiary)', strokeWidth: 1, marginBottom: 12 }} />
                    <p style={{ fontSize: 17, fontWeight: 500, color: 'var(--ms-text-primary)', marginBottom: 4 }}>
                      No patients found
                    </p>
                    <p style={{ fontSize: 15, color: 'var(--ms-text-secondary)' }}>
                      Try adjusting your search
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((patient, i) => {
                const shade = avatarShade(patient.full_name)
                const isPoly = patient.active_med_count >= 4
                return (
                  <tr
                    key={patient.id}
                    onClick={() => router.push(`/patients/${patient.id}`)}
                    style={{
                      borderTop: i > 0 ? '0.5px solid rgba(0,0,0,0.06)' : undefined,
                      cursor: 'pointer',
                      height: 56,
                      animationName: 'ms-entry',
                      animationDuration: '200ms',
                      animationTimingFunction: 'ease-out',
                      animationFillMode: 'both',
                      animationDelay: `${i * 30}ms`,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.02)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
                  >
                    {/* Patient — avatar + name + med count */}
                    <td className="px-5">
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            backgroundColor: shade.bg, color: shade.fg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 500, userSelect: 'none',
                          }}
                        >
                          {getInitials(patient.full_name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ms-text-primary)' }}>
                              {patient.full_name}
                            </span>
                            {isPoly && (
                              <AlertTriangle style={{ width: 14, height: 14, color: '#F59E0B', flexShrink: 0 }} />
                            )}
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--ms-text-tertiary)' }}>
                            · {patient.active_med_count} active med{patient.active_med_count !== 1 ? 's' : ''}
                            {isPoly && (
                              <span style={{
                                marginLeft: 6, fontSize: 11, fontWeight: 500, padding: '1px 6px',
                                borderRadius: 100, backgroundColor: 'rgba(217,119,6,0.08)',
                                border: '1px solid rgba(217,119,6,0.2)', color: '#92400E',
                              }}>
                                Poly
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* PDC bar */}
                    <td className="px-4">
                      <PDCBar score={patient.pdc_score} mounted={mounted} />
                    </td>

                    {/* Inventory */}
                    <td className="px-4">
                      <InventoryBadge days={patient.inventory_days} />
                    </td>

                    {/* Risk */}
                    <td className="px-4">
                      <RiskPill risk={patient.risk_level} />
                    </td>

                    {/* Actions — ghost text buttons */}
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          style={{ fontSize: 13, color: 'var(--ms-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 32 }}
                          onClick={() => router.push(`/patients/${patient.id}`)}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ms-text-primary)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ms-text-secondary)' }}
                        >
                          View
                        </button>
                        <button
                          className="flex items-center gap-1"
                          style={{ fontSize: 13, color: 'var(--ms-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 32 }}
                          onClick={() => setMessagingPatient({ id: patient.id, name: patient.full_name })}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ms-text-primary)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ms-text-secondary)' }}
                        >
                          <MessageCircle style={{ width: 14, height: 14 }} />
                          Message
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {messagingPatient && (
        <MessageDrawer
          patientId={messagingPatient.id}
          patientName={messagingPatient.name}
          onClose={() => setMessagingPatient(null)}
        />
      )}
    </div>
  )
}
