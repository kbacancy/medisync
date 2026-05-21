'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  MessageCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RiskBadge } from '@/components/ui/risk-badge'
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

const RISK_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  CRITICAL: 3,
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function PDCMiniBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-20 h-2 rounded-full bg-gray-100 overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-800 tabular-nums">
        {score}% Compliance
      </span>
    </div>
  )
}

function InventoryBadge({ days }: { days: number }) {
  if (days <= 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
        Refill Overdue (0 Days)
      </span>
    )
  }
  if (days <= 5) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
        Low Supply (≤5 Days)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
      Optimal (&gt;15 Days)
    </span>
  )
}

export function PatientsTable({ patients }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('risk_level')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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
    const rows = q
      ? patients.filter((p) => p.full_name.toLowerCase().includes(q))
      : [...patients]

    rows.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'full_name') cmp = a.full_name.localeCompare(b.full_name)
      else if (sortKey === 'pdc_score') cmp = a.pdc_score - b.pdc_score
      else if (sortKey === 'risk_level')
        cmp = RISK_ORDER[a.risk_level] - RISK_ORDER[b.risk_level]
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [patients, search, sortKey, sortDir])

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3.5 text-gray-400" />
    return sortDir === 'asc' ? (
      <ArrowUp className="size-3.5 text-[#0D6B5E]" />
    ) : (
      <ArrowDown className="size-3.5 text-[#0D6B5E]" />
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients…"
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0D6B5E]/30 focus:border-[#0D6B5E] transition-colors"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-5 py-3">
                <button
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors"
                  onClick={() => toggleSort('full_name')}
                >
                  Patient <SortIcon col="full_name" />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors"
                  onClick={() => toggleSort('pdc_score')}
                >
                  PDC Score <SortIcon col="pdc_score" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Inventory Status
              </th>
              <th className="text-left px-4 py-3">
                <button
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors"
                  onClick={() => toggleSort('risk_level')}
                >
                  Risk Flag <SortIcon col="risk_level" />
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                  <p className="text-sm font-medium">No patients found</p>
                  <p className="text-xs mt-1">Try adjusting your search</p>
                </td>
              </tr>
            ) : (
              filtered.map((patient) => {
                const isPoly = patient.active_med_count >= 4
                return (
                  <tr
                    key={patient.id}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-[#0D6B5E]/10 flex items-center justify-center shrink-0">
                          <span className="text-[#0D6B5E] text-xs font-semibold">
                            {getInitials(patient.full_name)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900">
                              {patient.full_name}
                            </p>
                            {isPoly && (
                              <AlertTriangle className="size-3.5 text-amber-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-gray-400">
                              {patient.active_med_count} Active Med
                              {patient.active_med_count !== 1 ? 's' : ''}
                            </span>
                            {isPoly && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 leading-none">
                                POLY
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <PDCMiniBar score={patient.pdc_score} />
                    </td>
                    <td className="px-4 py-4">
                      <InventoryBadge days={patient.inventory_days} />
                    </td>
                    <td className="px-4 py-4">
                      <RiskBadge risk={patient.risk_level} />
                    </td>
                    <td className="px-4 py-4">
                      <div
                        className="flex items-center gap-2 justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => router.push(`/patients/${patient.id}`)}
                        >
                          View Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1"
                        >
                          <MessageCircle className="size-3" />
                          Message
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
