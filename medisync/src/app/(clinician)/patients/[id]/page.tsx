import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

function makeSeedLogs(patientId: string, rxIds: string[]): AdherenceLog[] {
  const logs: AdherenceLog[] = []
  const today = new Date()
  for (let d = 0; d < 30; d++) {
    const date = subDays(today, d)
    for (const rxId of rxIds) {
      const scheduled = new Date(date)
      scheduled.setHours(8, 0, 0, 0)
      const isMissed = (d === 3 || d === 10 || d === 18) && rxId === rxIds[0]
      const isSkipped = (d === 7 || d === 14) && rxId === rxIds[1]
      const status: AdherenceLog['status'] =
        scheduled > today ? 'pending' : isMissed ? 'missed' : isSkipped ? 'skipped' : 'taken'
      logs.push({
        id: `seed-${rxId}-${d}`,
        patient_id: patientId,
        prescription_id: rxId,
        scheduled_time: scheduled.toISOString(),
        actual_time: status === 'taken' ? new Date(scheduled.getTime() + 600_000).toISOString() : undefined,
        status,
        created_at: scheduled.toISOString(),
      })
    }
  }
  return logs
}

const SEED_PRESCRIPTIONS_BY_ID: Record<string, PrescriptionWithStats[]> = {
  '1': [
    { id: 'rx-m1-1', medication_name: 'Lisinopril',    dosage: '10mg',  frequency: 'Once daily',  instructions: 'Take in the morning with water', form: 'Tablet',  start_date: '2026-02-01', end_date: null, status: 'active', pdc_score: 88, inventory_days: 18, last_taken: subDays(new Date(), 1).toISOString() },
    { id: 'rx-m1-2', medication_name: 'Metformin',     dosage: '500mg', frequency: 'Twice daily', instructions: 'Take with food',                  form: 'Tablet',  start_date: '2026-01-15', end_date: null, status: 'active', pdc_score: 79, inventory_days: 12, last_taken: new Date().toISOString() },
    { id: 'rx-m1-3', medication_name: 'Atorvastatin',  dosage: '40mg',  frequency: 'Once daily',  instructions: 'Take at bedtime',                 form: 'Tablet',  start_date: '2026-01-01', end_date: null, status: 'active', pdc_score: 82, inventory_days: 22, last_taken: subDays(new Date(), 1).toISOString() },
  ],
  '2': [
    { id: 'rx-m2-1', medication_name: 'Warfarin',      dosage: '5mg',   frequency: 'Once daily',  instructions: 'Take at same time each day',     form: 'Tablet',  start_date: '2025-11-01', end_date: null, status: 'active', pdc_score: 54, inventory_days: 3,  last_taken: subDays(new Date(), 3).toISOString() },
    { id: 'rx-m2-2', medication_name: 'Metoprolol',    dosage: '25mg',  frequency: 'Twice daily', instructions: 'Take with food',                  form: 'Tablet',  start_date: '2025-12-01', end_date: null, status: 'active', pdc_score: 60, inventory_days: 5,  last_taken: subDays(new Date(), 2).toISOString() },
    { id: 'rx-m2-3', medication_name: 'Furosemide',    dosage: '20mg',  frequency: 'Once daily',  instructions: 'Take in the morning',             form: 'Tablet',  start_date: '2026-01-10', end_date: null, status: 'active', pdc_score: 48, inventory_days: 0,  last_taken: subDays(new Date(), 5).toISOString() },
    { id: 'rx-m2-4', medication_name: 'Potassium Chloride', dosage: '10mEq', frequency: 'Once daily', instructions: 'Take with full glass of water', form: 'Tablet', start_date: '2026-01-10', end_date: null, status: 'active', pdc_score: 55, inventory_days: 4, last_taken: subDays(new Date(), 3).toISOString() },
    { id: 'rx-m2-5', medication_name: 'Amlodipine',    dosage: '5mg',   frequency: 'Once daily',  instructions: null,                              form: 'Tablet',  start_date: '2025-10-01', end_date: null, status: 'active', pdc_score: 52, inventory_days: 2,  last_taken: subDays(new Date(), 4).toISOString() },
  ],
}

function getSeedPatient(id: string): PatientDetail {
  const patients: Record<string, PatientDetail> = {
    '1': { id: '1', full_name: 'Maria Santos',  date_of_birth: '1979-04-12', gender: 'Female', blood_type: 'A+',  blood_pressure: '128/82', heart_rate: 74, risk_level: 'MODERATE' },
    '2': { id: '2', full_name: 'James Wilson',  date_of_birth: '1955-09-03', gender: 'Male',   blood_type: 'O+',  blood_pressure: '145/95', heart_rate: 82, risk_level: 'CRITICAL' },
    '3': { id: '3', full_name: 'Aisha Johnson', date_of_birth: '1990-07-22', gender: 'Female', blood_type: 'B+',  blood_pressure: '118/74', heart_rate: 68, risk_level: 'LOW'      },
    '4': { id: '4', full_name: 'Robert Chen',   date_of_birth: '1968-01-30', gender: 'Male',   blood_type: 'AB+', blood_pressure: '135/88', heart_rate: 77, risk_level: 'HIGH'     },
    '5': { id: '5', full_name: 'Lisa Park',     date_of_birth: '1985-11-08', gender: 'Female', blood_type: 'A-',  blood_pressure: '122/78', heart_rate: 71, risk_level: 'MODERATE' },
    '6': { id: '6', full_name: 'David Okafor',  date_of_birth: '1972-05-19', gender: 'Male',   blood_type: 'O-',  blood_pressure: '115/72', heart_rate: 65, risk_level: 'LOW'      },
    '7': { id: '7', full_name: 'Emma Davis',    date_of_birth: '1961-03-14', gender: 'Female', blood_type: 'B-',  blood_pressure: '140/92', heart_rate: 80, risk_level: 'HIGH'     },
    '8': { id: '8', full_name: 'Carlos Rivera', date_of_birth: '1982-08-27', gender: 'Male',   blood_type: 'A+',  blood_pressure: '125/80', heart_rate: 70, risk_level: 'MODERATE' },
  }
  return (
    patients[id] ?? {
      id,
      full_name: 'Unknown Patient',
      date_of_birth: null,
      gender: 'Unknown',
      blood_type: null,
      blood_pressure: null,
      heart_rate: null,
      risk_level: 'MODERATE' as RiskLevel,
    }
  )
}

function getSeedAlerts(id: string): AlertEntry[] {
  const map: Record<string, AlertEntry[]> = {
    '2': [
      { id: 'a1', severity: 'critical', message: 'INR below therapeutic range — warfarin dose review recommended.' },
      { id: 'a2', severity: 'critical', message: 'Refill overdue for Furosemide. Patient has 0 days remaining supply.' },
      { id: 'a3', severity: 'warning',  message: 'PDC score dropped below 60% — critical non-adherence threshold.' },
    ],
    '4': [
      { id: 'a1', severity: 'warning',  message: 'Blood pressure trending high over last 3 readings.' },
      { id: 'a2', severity: 'warning',  message: 'Low supply detected — refill recommended within 5 days.' },
    ],
    '7': [
      { id: 'a1', severity: 'warning',  message: 'Polypharmacy detected. Review for potential interactions.' },
      { id: 'a2', severity: 'critical', message: 'Refill overdue. Patient has not collected prescription.' },
    ],
  }
  return map[id] ?? [
    { id: 'a1', severity: 'info', message: 'No critical alerts. Continue regular monitoring.' },
  ]
}

function getSeedAppointments(id: string): AppointmentEntry[] {
  const base = new Date()
  return [
    {
      id: `appt-${id}-1`,
      scheduled_at: subDays(base, 5).toISOString(),
      type: 'telehealth',
      reason: 'Medication review and adherence follow-up',
      status: 'completed',
      notes: 'Patient reports occasional missed doses due to work schedule. Discussed blister pack packaging. BP within acceptable range.',
    },
    {
      id: `appt-${id}-2`,
      scheduled_at: subDays(base, 30).toISOString(),
      type: 'in_person',
      reason: 'Quarterly check-up',
      status: 'completed',
      notes: 'Labs reviewed. Lipid panel improved. Continue current regimen.',
    },
    {
      id: `appt-${id}-3`,
      scheduled_at: subDays(base, 62).toISOString(),
      type: 'telehealth',
      reason: 'Hypertension management',
      status: 'completed',
      notes: null,
    },
    {
      id: `appt-${id}-4`,
      scheduled_at: subDays(base, -14).toISOString(),
      type: 'in_person',
      reason: 'Routine follow-up',
      status: 'scheduled',
      notes: null,
    },
  ]
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
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
    profile: { full_name: string } | null
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
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
    notes?: string | null
  }

  const useSeed = !patientData
  if (!useSeed && !patientData) return notFound()

  const patient: PatientDetail = patientData
    ? {
        id: (patientData as RawPatient).id,
        full_name: (patientData as RawPatient).profile?.full_name ?? 'Unknown',
        date_of_birth: (patientData as RawPatient).date_of_birth,
        gender: (patientData as RawPatient).gender,
        blood_type: (patientData as RawPatient).blood_type,
        blood_pressure: (patientData as RawPatient).blood_pressure,
        heart_rate: (patientData as RawPatient).heart_rate,
        risk_level: (patientData as RawPatient).risk_level,
      }
    : getSeedPatient(id)

  const seedPrescriptions = SEED_PRESCRIPTIONS_BY_ID[id] ?? SEED_PRESCRIPTIONS_BY_ID['1']

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
      : seedPrescriptions

  const rxIds = prescriptions.map((p) => p.id)
  const seedLogs = makeSeedLogs(patient.id, rxIds)
  const logs: AdherenceLog[] =
    logData && (logData as AdherenceLog[]).length > 0
      ? (logData as AdherenceLog[])
      : seedLogs

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
      : getSeedAppointments(id)

  const alerts: AlertEntry[] = getSeedAlerts(id)

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
