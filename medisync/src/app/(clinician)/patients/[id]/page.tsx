import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { subDays, format } from 'date-fns'
import { PatientDetailView } from '@/components/adherence/PatientDetailView'
import type {
  PatientDetail,
  PrescriptionWithStats,
  HeatmapEntry,
  PDCTrendEntry,
  RxBreakdown,
  AppointmentEntry,
  AlertEntry,
} from '@/components/adherence/PatientDetailView'
import { buildHeatmapData, calculatePDCByPrescription, calculateStreak } from '@/lib/pdc/calculator'
import type { AdherenceLog, RiskLevel } from '@/types'

function buildPDCTrend(logs: AdherenceLog[], prescriptionIds: string[]): PDCTrendEntry[] {
  const today = new Date()
  return Array.from({ length: 30 }, (_, i) => {
    const endDate = subDays(today, 29 - i)
    const startDate = subDays(endDate, 29)
    const endStr = format(endDate, 'yyyy-MM-dd')
    const startStr = format(startDate, 'yyyy-MM-dd')
    const windowLogs = logs.filter(
      (l) => l.scheduled_time >= startStr && l.scheduled_time <= endStr
    )
    if (!windowLogs.length || !prescriptionIds.length) return { date: format(endDate, 'MM/dd'), pdc: 0 }
    const scores = prescriptionIds.map((id) =>
      calculatePDCByPrescription(windowLogs, id, startStr, endStr)
    )
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    return { date: format(endDate, 'MM/dd'), pdc: avg }
  })
}


function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sessionClient = await createClient()
  const supabase = getServiceClient()

  const { data: { user } } = await sessionClient.auth.getUser()
  const doctorId = user?.id ?? 'seed-doctor-1'

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

  const [
    { data: patientData },
    { data: rxData },
    { data: logData },
    { data: pdcData },
    { data: apptData },
  ] = await Promise.all([
    supabase
      .from('patients')
      .select(`
        id, risk_level, date_of_birth, gender, blood_type, blood_pressure, heart_rate,
        profile:profiles!profile_id(full_name)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('prescriptions')
      .select(`*, dispense:dispense_records(remaining_count, dispensed_at)`)
      .eq('patient_id', id),
    supabase
      .from('adherence_logs')
      .select('*')
      .eq('patient_id', id)
      .gte('scheduled_time', thirtyDaysAgo),
    supabase
      .from('pdc_scores')
      .select('*')
      .eq('patient_id', id),
    supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', id)
      .order('scheduled_at', { ascending: false })
      .limit(20),
  ])

  type RawPatient = {
    id: string
    risk_level: RiskLevel
    date_of_birth: string | null
    gender: string
    blood_type: string | null
    blood_pressure: string | null
    heart_rate: number | null
    profile: { full_name: string } | { full_name: string }[] | null
  }
  type RawRx = {
    id: string
    medication_name: string
    dosage: string
    frequency: string
    instructions: string | null
    form: string | null
    start_date: string
    end_date: string | null
    status: 'active' | 'discontinued' | 'completed'
    dispense: { remaining_count: number; dispensed_at: string }[]
  }
  type RawAppt = {
    id: string
    scheduled_at: string
    type: 'telehealth' | 'in_person'
    reason: string
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'in-call'
    notes?: string | null
  }

  if (!patientData) return notFound()

  const rawPatient = patientData as RawPatient
  const rawProfile = Array.isArray(rawPatient?.profile) ? rawPatient.profile[0] : rawPatient?.profile
  const patient: PatientDetail = {
    id: rawPatient.id,
    full_name: rawProfile?.full_name || 'Patient',
    date_of_birth: rawPatient.date_of_birth,
    gender: rawPatient.gender,
    blood_type: rawPatient.blood_type,
    blood_pressure: rawPatient.blood_pressure,
    heart_rate: rawPatient.heart_rate,
    risk_level: rawPatient.risk_level,
  }

  const prescriptions: PrescriptionWithStats[] =
    rxData && (rxData as RawRx[]).length > 0
      ? (rxData as RawRx[]).map((rx) => {
          const latest = [...(rx.dispense ?? [])].sort(
            (a, b) => new Date(b.dispensed_at).getTime() - new Date(a.dispensed_at).getTime()
          )[0]
          const pdcEntry = (pdcData ?? []).find(
            (p: { prescription_id: string; score: number }) => p.prescription_id === rx.id
          )
          return {
            id: rx.id,
            medication_name: rx.medication_name,
            dosage: rx.dosage,
            frequency: rx.frequency,
            instructions: rx.instructions,
            form: rx.form,
            start_date: rx.start_date,
            end_date: rx.end_date,
            status: rx.status,
            pdc_score: pdcEntry?.score ?? 0,
            inventory_days: latest?.remaining_count ?? 20,
            last_taken: null,
          }
        })
      : []

  const rxIds = prescriptions.map((p) => p.id)
  const logs: AdherenceLog[] =
    logData && (logData as AdherenceLog[]).length > 0
      ? (logData as AdherenceLog[])
      : []

  const heatmapData: HeatmapEntry[] = buildHeatmapData(logs, 35)

  const pdcTrend: PDCTrendEntry[] = buildPDCTrend(logs, rxIds)

  const startStr = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const endStr = format(new Date(), 'yyyy-MM-dd')

  const rxBreakdown: RxBreakdown[] = prescriptions
    .filter((p) => p.status === 'active')
    .map((rx) => {
      const rxLogs = logs.filter((l) => l.prescription_id === rx.id)
      return {
        id: rx.id,
        medication_name: rx.medication_name,
        pdc: calculatePDCByPrescription(logs, rx.id, startStr, endStr),
        streak: calculateStreak(rxLogs),
        taken: rxLogs.filter((l) => l.status === 'taken').length,
        missed: rxLogs.filter((l) => l.status === 'missed').length,
      }
    })

  const pdcScores = prescriptions
    .filter((p) => p.status === 'active')
    .map((p) => p.pdc_score || calculatePDCByPrescription(logs, p.id, startStr, endStr))
  const overallPDC =
    pdcScores.length > 0
      ? Math.round(pdcScores.reduce((a, b) => a + b, 0) / pdcScores.length)
      : 0

  const appointments: AppointmentEntry[] =
    apptData && (apptData as RawAppt[]).length > 0
      ? (apptData as RawAppt[]).map((a) => ({
          id: a.id,
          scheduled_at: a.scheduled_at,
          type: a.type,
          reason: a.reason,
          status: a.status,
          notes: a.notes ?? null,
        }))
      : []

  const alerts: AlertEntry[] = (() => {
    const derived: AlertEntry[] = []

    if (patient.risk_level === 'CRITICAL') {
      derived.push({ id: 'risk-critical', severity: 'critical', message: 'Patient classified as CRITICAL risk — immediate clinical attention required.' })
    } else if (patient.risk_level === 'HIGH') {
      derived.push({ id: 'risk-high', severity: 'warning', message: 'Patient classified as HIGH risk — close monitoring recommended.' })
    }

    if (overallPDC < 60 && rxIds.length > 0) {
      derived.push({ id: 'pdc-low', severity: 'warning', message: `PDC score ${overallPDC}% — below 60% critical non-adherence threshold.` })
    }

    const activePrescriptions = prescriptions.filter((p) => p.status === 'active')
    activePrescriptions.forEach((rx) => {
      if (rx.inventory_days === 0) {
        derived.push({ id: `refill-${rx.id}`, severity: 'critical', message: `${rx.medication_name}: refill overdue — 0 days supply remaining.` })
      } else if (rx.inventory_days <= 5) {
        derived.push({ id: `low-${rx.id}`, severity: 'warning', message: `${rx.medication_name}: low supply — only ${rx.inventory_days} day(s) remaining.` })
      }
    })

    if (activePrescriptions.length >= 5) {
      derived.push({ id: 'polypharmacy', severity: 'warning', message: `Polypharmacy detected — ${activePrescriptions.length} active prescriptions. Review for potential interactions.` })
    }

    if (derived.length === 0) {
      derived.push({ id: 'ok', severity: 'info', message: 'No critical alerts. Continue regular monitoring.' })
    }

    return derived
  })()

  return (
    <PatientDetailView
      patient={patient}
      prescriptions={prescriptions}
      heatmapData={heatmapData}
      pdcTrend={pdcTrend}
      rxBreakdown={rxBreakdown}
      appointments={appointments}
      alerts={alerts}
      overallPDC={overallPDC}
      doctorId={doctorId}
    />
  )
}
