'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInYears, parseISO } from 'date-fns'
import {
  Heart,
  Activity,
  Droplets,
  Pill,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  Video,
  User,
  ChevronLeft,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RiskBadge } from '@/components/ui/risk-badge'
import { PDCRing } from '@/components/adherence/PDCRing'
import { AdherenceHeatmap } from '@/components/adherence/AdherenceHeatmap'
import { NewPrescriptionModal } from '@/components/adherence/NewPrescriptionModal'
import type { RiskLevel, AppointmentType, AppointmentStatus } from '@/types'
import type { DoseStatus } from '@/lib/pdc/calculator'

export interface PatientDetail {
  id: string
  full_name: string
  date_of_birth: string | null
  gender: string
  blood_type: string | null
  blood_pressure: string | null
  heart_rate: number | null
  risk_level: RiskLevel
}

export interface PrescriptionWithStats {
  id: string
  medication_name: string
  dosage: string
  frequency: string
  instructions: string | null
  form: string | null
  start_date: string
  end_date: string | null
  status: 'active' | 'discontinued' | 'completed'
  pdc_score: number
  inventory_days: number
  last_taken: string | null
}

export interface HeatmapEntry {
  date: string
  status: DoseStatus | 'none'
}

export interface PDCTrendEntry {
  date: string
  pdc: number
}

export interface RxBreakdown {
  id: string
  medication_name: string
  pdc: number
  streak: number
  taken: number
  missed: number
}

export interface AppointmentEntry {
  id: string
  scheduled_at: string
  type: AppointmentType
  reason: string
  status: AppointmentStatus
  notes: string | null
}

export interface AlertEntry {
  id: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}

interface Props {
  patient: PatientDetail
  prescriptions: PrescriptionWithStats[]
  heatmapData: HeatmapEntry[]
  pdcTrend: PDCTrendEntry[]
  rxBreakdown: RxBreakdown[]
  appointments: AppointmentEntry[]
  alerts: AlertEntry[]
  overallPDC: number
  doctorId: string
}

function PDCBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 tabular-nums w-8 text-right">
        {score}%
      </span>
    </div>
  )
}

function InventoryBadge({ days }: { days: number }) {
  if (days <= 0)
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
        Refill Overdue
      </span>
    )
  if (days <= 5)
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Low Supply
      </span>
    )
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      Optimal
    </span>
  )
}

function AlertIcon({ severity }: { severity: AlertEntry['severity'] }) {
  if (severity === 'critical')
    return <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
  if (severity === 'warning')
    return <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
  return <CheckCircle2 className="size-4 text-blue-500 shrink-0 mt-0.5" />
}

function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const map: Record<AppointmentStatus, string> = {
    scheduled:  'bg-blue-50 text-blue-700 border-blue-200',
    completed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled:  'bg-gray-100 text-gray-500 border-gray-200',
    no_show:    'bg-red-50 text-red-700 border-red-200',
    'in-call':  'bg-purple-50 text-purple-700 border-purple-200',
  }
  const labels: Record<AppointmentStatus, string> = {
    scheduled:  'Scheduled',
    completed:  'Completed',
    cancelled:  'Cancelled',
    no_show:    'No Show',
    'in-call':  'In Call',
  }
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[status]}`}
    >
      {labels[status]}
    </span>
  )
}

export function PatientDetailView({
  patient,
  prescriptions,
  heatmapData,
  pdcTrend,
  rxBreakdown,
  appointments,
  alerts,
  overallPDC,
  doctorId,
}: Props) {
  const router = useRouter()
  const [rxModalOpen, setRxModalOpen] = useState(false)

  const age = patient.date_of_birth
    ? differenceInYears(new Date(), parseISO(patient.date_of_birth))
    : null

  const activePrescriptions = prescriptions.filter((p) => p.status === 'active')

  return (
    <div className="space-y-5 pb-8">
      <button
        onClick={() => router.push('/patients')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="size-4" />
        All Patients
      </button>

      {/* Patient header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="size-16 rounded-full bg-[#0D6B5E]/10 flex items-center justify-center shrink-0">
            <span className="text-[#0D6B5E] text-xl font-bold">
              {patient.full_name
                .split(' ')
                .map((p) => p.charAt(0))
                .slice(0, 2)
                .join('')}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{patient.full_name}</h1>
              <RiskBadge risk={patient.risk_level} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {[
                age ? `${age} years` : null,
                patient.gender,
                patient.blood_type ? `Blood type ${patient.blood_type}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>

            <div className="flex items-center gap-5 mt-3 flex-wrap">
              {patient.blood_pressure && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Activity className="size-4 text-[#0D6B5E]" />
                  <span className="font-medium">{patient.blood_pressure}</span>
                  <span className="text-gray-400 text-xs">mmHg</span>
                </div>
              )}
              {patient.heart_rate && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Heart className="size-4 text-red-400" />
                  <span className="font-medium">{patient.heart_rate}</span>
                  <span className="text-gray-400 text-xs">bpm</span>
                </div>
              )}
              {patient.blood_type && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Droplets className="size-4 text-blue-400" />
                  <span className="font-medium">{patient.blood_type}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Pill className="size-4 text-purple-400" />
                <span className="font-medium">{activePrescriptions.length}</span>
                <span className="text-gray-400 text-xs">active meds</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <PDCRing pdc={overallPDC} size={100} strokeWidth={10} />
            <p className="text-[11px] text-gray-400 mt-1">30-day PDC</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="adherence">Adherence</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {alerts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Care Alerts</h2>
              <div className="space-y-2.5">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2.5">
                    <AlertIcon severity={alert.severity} />
                    <p className="text-sm text-gray-700">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Overall PDC', value: `${overallPDC}%`, sub: 'Last 30 days' },
              {
                label: 'Active Meds',
                value: activePrescriptions.length,
                sub: activePrescriptions.length >= 4 ? 'Polypharmacy' : 'Prescriptions',
              },
              {
                label: 'Heart Rate',
                value: patient.heart_rate ? `${patient.heart_rate} bpm` : '—',
                sub: 'Latest reading',
              },
              {
                label: 'Blood Pressure',
                value: patient.blood_pressure ?? '—',
                sub: 'Latest reading',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Active Prescriptions
            </h2>
            {activePrescriptions.length === 0 ? (
              <p className="text-sm text-gray-400">No active prescriptions</p>
            ) : (
              <div className="space-y-2">
                {activePrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="size-8 rounded-lg bg-[#0D6B5E]/10 flex items-center justify-center shrink-0">
                      <Pill className="size-4 text-[#0D6B5E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {rx.medication_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {rx.dosage} · {rx.frequency}
                      </p>
                    </div>
                    <div className="text-right">
                      <InventoryBadge days={rx.inventory_days} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Medications ── */}
        <TabsContent value="medications" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {activePrescriptions.length} Active Prescription
              {activePrescriptions.length !== 1 ? 's' : ''}
            </h2>
            <Button
              size="sm"
              className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white gap-1.5"
              onClick={() => setRxModalOpen(true)}
            >
              <Plus className="size-4" />
              New Prescription
            </Button>
          </div>

          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900">{rx.medication_name}</p>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        rx.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}
                    >
                      {rx.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {rx.dosage}
                    {rx.form ? ` · ${rx.form}` : ''} · {rx.frequency}
                  </p>
                  {rx.instructions && (
                    <p className="text-xs text-gray-400 mt-1">{rx.instructions}</p>
                  )}
                </div>
                <InventoryBadge days={rx.inventory_days} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>PDC Score</span>
                  <span className="font-semibold">{rx.pdc_score}%</span>
                </div>
                <PDCBar score={rx.pdc_score} />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  Started {format(parseISO(rx.start_date), 'MMM d, yyyy')}
                </span>
                {rx.last_taken && (
                  <span>
                    Last taken{' '}
                    {format(parseISO(rx.last_taken), 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          ))}

          {prescriptions.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
              <Pill className="size-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">No prescriptions yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add the first prescription for this patient
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── Adherence ── */}
        <TabsContent value="adherence" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              30-Day Adherence Calendar
            </h2>
            <AdherenceHeatmap data={heatmapData} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">PDC Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={pdcTrend}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="pdcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D6B5E" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0D6B5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  interval={6}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                  formatter={(v) => [v != null ? `${v}%` : '', 'PDC']}
                />
                <Area
                  type="monotone"
                  dataKey="pdc"
                  stroke="#0D6B5E"
                  strokeWidth={2}
                  fill="url(#pdcGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#0D6B5E' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-sm font-semibold text-gray-900">
                Per-Prescription Breakdown
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Drug
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    PDC%
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Streak
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Taken
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Missed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rxBreakdown.map((rx) => (
                  <tr key={rx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {rx.medication_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              rx.pdc >= 80
                                ? 'bg-emerald-500'
                                : rx.pdc >= 60
                                ? 'bg-amber-400'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${rx.pdc}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {rx.pdc}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {rx.streak}d
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-600 font-semibold text-sm">
                        {rx.taken}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-red-500 font-semibold text-sm">
                        {rx.missed}
                      </span>
                    </td>
                  </tr>
                ))}
                {rxBreakdown.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-sm text-gray-400"
                    >
                      No adherence data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Appointment History
            </h2>
            {appointments.length === 0 ? (
              <p className="text-sm text-gray-400">No appointments on record</p>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div key={appt.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                          appt.type === 'telehealth'
                            ? 'bg-blue-50'
                            : 'bg-purple-50'
                        }`}
                      >
                        {appt.type === 'telehealth' ? (
                          <Video className="size-4 text-blue-500" />
                        ) : (
                          <User className="size-4 text-purple-500" />
                        )}
                      </div>
                      <div className="w-px flex-1 bg-gray-100 mt-1" />
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">
                          {appt.reason}
                        </p>
                        <AppointmentStatusBadge status={appt.status} />
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                            appt.type === 'telehealth'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-purple-50 text-purple-600 border-purple-200'
                          }`}
                        >
                          {appt.type === 'telehealth' ? 'Telehealth' : 'In-Person'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                        <Calendar className="size-3" />
                        {format(parseISO(appt.scheduled_at), 'MMM d, yyyy h:mm a')}
                      </div>
                      {appt.notes && (
                        <p className="mt-2 text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
                          {appt.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <NewPrescriptionModal
        patientId={patient.id}
        doctorId={doctorId}
        open={rxModalOpen}
        onClose={() => setRxModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
