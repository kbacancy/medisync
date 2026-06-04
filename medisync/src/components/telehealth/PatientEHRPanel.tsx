import { Zap, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Medication {
  name: string
  dose: string
  frequency: string
}

interface Lab {
  name: string
  value: string
  date: string
}

interface PatientEHRPanelProps {
  name: string
  age: number | null
  gender: string
  bloodType: string
  bloodPressure: string
  heartRate: number | null
  allergies: string[]
  diagnoses: string[]
  labs: Lab[]
  medications: Medication[]
  careAlert?: string
  headacheLogTrend?: { direction: 'up' | 'down'; percentage: number } | null
  sleepQuality?: 'GOOD' | 'FAIR' | 'POOR' | null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export function PatientEHRPanel({
  name,
  age,
  gender,
  bloodType,
  bloodPressure,
  heartRate,
  allergies,
  diagnoses,
  labs,
  medications,
  careAlert,
  headacheLogTrend,
  sleepQuality,
}: PatientEHRPanelProps) {
  const sleepColor =
    sleepQuality === 'GOOD'
      ? 'text-emerald-600 bg-emerald-50'
      : sleepQuality === 'POOR'
        ? 'text-red-600 bg-red-50'
        : 'text-amber-600 bg-amber-50'

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Patient EHR</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Patient identity */}
        <div className="flex flex-col items-center gap-2 pb-4 border-b border-gray-100">
          <div className="size-16 rounded-full bg-[#0D6B5E] flex items-center justify-center">
            <span className="text-white text-xl font-bold">{getInitials(name)}</span>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900">{name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {age != null ? `${age} y/o` : '— y/o'} · {gender} · Blood Type: {bloodType}
            </p>
          </div>
        </div>

        {/* Vitals */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Blood Pressure</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{bloodPressure}</p>
            <p className="text-[10px] text-gray-400">mmHg</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Heart Rate</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{heartRate ?? '—'}</p>
            <p className="text-[10px] text-gray-400">bpm</p>
          </div>
        </div>

        {/* Recent History — only rendered when real data exists */}
        {(headacheLogTrend != null || sleepQuality != null) && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Recent History
            </p>
            <div className="space-y-2">
              {headacheLogTrend != null && (
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-gray-900">Headache Log (7d)</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Frequency trend</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {headacheLogTrend.direction === 'up' ? (
                      <TrendingUp className="size-3.5 text-amber-500" />
                    ) : (
                      <TrendingDown className="size-3.5 text-emerald-500" />
                    )}
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        headacheLogTrend.direction === 'up' ? 'text-amber-600' : 'text-emerald-600'
                      )}
                    >
                      {headacheLogTrend.direction === 'up' ? '+' : '-'}{headacheLogTrend.percentage}%
                    </span>
                  </div>
                </div>
              )}
              {sleepQuality != null && (
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-gray-900">Sleep Quality</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Past 7 nights</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded', sleepColor)}>
                    {sleepQuality}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current RX */}
        {medications.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Current RX
            </p>
            <div className="space-y-1.5">
              {medications.map((med, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 bg-white"
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{med.name}</p>
                    <p className="text-[10px] text-gray-500">{med.frequency}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                    {med.dose}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Care Alert */}
        {careAlert && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 flex gap-2">
            <Zap className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Care Alert</p>
              <p className="text-xs text-amber-800 mt-0.5">{careAlert}</p>
            </div>
          </div>
        )}

        {/* Allergies (compact) */}
        {allergies.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
              Allergies
            </p>
            <div className="flex flex-wrap gap-1">
              {allergies.map((a) => (
                <span
                  key={a}
                  className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded font-medium"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent labs (compact) */}
        {labs.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
              Recent Labs
            </p>
            <div className="space-y-1">
              {labs.map((lab, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{lab.name}</span>
                  <span className="text-gray-900 font-medium">{lab.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
