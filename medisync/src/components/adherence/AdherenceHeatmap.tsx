'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { DoseStatus } from '@/lib/pdc/calculator'

interface HeatmapDay {
  date: string
  status: DoseStatus | 'none'
}

interface Props {
  data: HeatmapDay[]
}

const STATUS_CONFIG: Record<DoseStatus | 'none', { bg: string; label: string }> = {
  taken:   { bg: 'bg-teal-500',  label: 'Taken'   },
  missed:  { bg: 'bg-red-400',   label: 'Missed'  },
  skipped: { bg: 'bg-amber-400', label: 'Skipped' },
  snoozed: { bg: 'bg-amber-200', label: 'Snoozed' },
  late:    { bg: 'bg-teal-300',  label: 'Late'    },
  pending: { bg: 'bg-gray-100',  label: 'Pending' },
  none:    { bg: 'bg-gray-100',  label: 'No Data' },
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

export function AdherenceHeatmap({ data }: Props) {
  const [tooltip, setTooltip] = useState<{
    date: string
    status: DoseStatus | 'none'
    x: number
    y: number
  } | null>(null)

  const weeks = chunk(data, 7)

  return (
    <div className="relative select-none">
      <div className="flex gap-1.5 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="w-7 text-center text-[10px] text-gray-400 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1.5">
            {week.map((day, di) => {
              const cfg = STATUS_CONFIG[day.status]
              return (
                <div
                  key={day.date + di}
                  className={`w-7 h-7 rounded-sm cursor-pointer transition-opacity hover:opacity-70 ${cfg.bg}`}
                  onMouseEnter={(e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect()
                    setTooltip({ date: day.date, status: day.status, x: rect.left, y: rect.top })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </div>
        ))}
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 pointer-events-none shadow-lg"
          style={{ left: tooltip.x + 4, top: tooltip.y - 42 }}
        >
          <p className="font-semibold">{format(parseISO(tooltip.date), 'MMM d, yyyy')}</p>
          <p className="text-gray-300">{STATUS_CONFIG[tooltip.status].label}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-3">
        {(['taken', 'missed', 'skipped', 'snoozed', 'none'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className={`w-3 h-3 rounded-sm inline-block ${STATUS_CONFIG[s].bg}`} />
            {STATUS_CONFIG[s].label}
          </span>
        ))}
      </div>
    </div>
  )
}
