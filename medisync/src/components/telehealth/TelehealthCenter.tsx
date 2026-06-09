'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Pill, ClipboardList, FlaskConical, Video, Users } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { WaitingRoomCard } from './WaitingRoomCard'
import { VideoCallPanel } from './VideoCallPanel'
import { ClinicalNotes } from './ClinicalNotes'
import { PatientEHRPanel } from './PatientEHRPanel'
import { DDIWarningBanner } from './DDIWarningBanner'
import { NewAppointmentModal } from './NewAppointmentModal'
import { NewPrescriptionModal } from '@/components/adherence/NewPrescriptionModal'
import { NewLabOrderModal } from '@/components/adherence/NewLabOrderModal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WaitingPatient {
  id: string
  name: string
  initials: string
  reason: string
  status: 'waiting' | 'in-call'
  waitMinutes?: number
  appointmentId?: string
  roomUrl?: string
  roomName?: string
}

export interface UpcomingSlot {
  id: string
  time: string
  patientName: string
  reason: string
}

interface EHRMedication {
  name: string
  dose: string
  frequency: string
}

interface EHRLab {
  name: string
  value: string
  date: string
}

interface ActivePatientEHR {
  id: string
  appointmentId: string
  name: string
  age: number | null
  gender: string
  bloodType: string
  bloodPressure: string
  heartRate: number | null
  allergies: string[]
  diagnoses: string[]
  labs: EHRLab[]
  medications: EHRMedication[]
  careAlert?: string
  conditions: string[]
  headacheLogTrend: { direction: 'up' | 'down'; percentage: number } | null
  sleepQuality: 'GOOD' | 'FAIR' | 'POOR' | null
}

interface ActiveCall {
  appointmentId: string
  roomUrl: string
  roomName: string
  patientName: string
  patientId: string
}

interface TelehealthCenterProps {
  initialPatients?: WaitingPatient[]
  initialUpcoming?: UpcomingSlot[]
}

// ─── EHR Summary tab ──────────────────────────────────────────────────────────

function EHRSummaryTab({ patient }: { patient: ActivePatientEHR | null }) {
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
        <ClipboardList className="size-8 opacity-30" />
        <p className="text-sm">Select a patient to view their EHR</p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {patient.allergies.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
            Allergies
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {patient.allergies.map((a) => (
              <span
                key={a}
                className="text-xs px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded font-medium"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
      {patient.diagnoses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
            Past Diagnoses
          </p>
          <ul className="space-y-1">
            {patient.diagnoses.map((d) => (
              <li key={d} className="text-sm text-gray-700 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#0D6B5E] shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}
      {patient.labs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
            Recent Lab Results
          </p>
          <div className="space-y-1.5">
            {patient.labs.map((lab) => (
              <div
                key={lab.name}
                className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"
              >
                <span className="text-gray-600">{lab.name}</span>
                <div className="text-right">
                  <span className="font-medium text-gray-900">{lab.value}</span>
                  <span className="text-xs text-gray-400 ml-2">{lab.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {patient.allergies.length === 0 && patient.diagnoses.length === 0 && patient.labs.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No EHR records on file.</p>
      )}
    </div>
  )
}

// ─── Prescriptions tab ────────────────────────────────────────────────────────

function PrescriptionsTab({
  patient,
  onNewPrescription,
}: {
  patient: ActivePatientEHR | null
  onNewPrescription: () => void
}) {
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
        <Pill className="size-8 opacity-30" />
        <p className="text-sm">Select a patient to view prescriptions</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-900">Active Prescriptions</p>
        <Button
          size="sm"
          className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white text-xs h-7 gap-1"
          onClick={onNewPrescription}
        >
          <Plus className="size-3" />
          New Prescription
        </Button>
      </div>
      {patient.medications.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No active prescriptions.</p>
      ) : (
        patient.medications.map((med, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Pill className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{med.name}</p>
                <p className="text-xs text-gray-500">{med.frequency}</p>
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700 bg-white border border-gray-200 px-2.5 py-0.5 rounded-lg">
              {med.dose}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Lab Orders tab ───────────────────────────────────────────────────────────

function LabOrdersTab({
  patient,
  onOrderLabs,
}: {
  patient: ActivePatientEHR | null
  onOrderLabs: () => void
}) {
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
        <FlaskConical className="size-8 opacity-30" />
        <p className="text-sm">Select a patient to order lab tests</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-900">Lab Orders</p>
        <Button
          size="sm"
          className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white text-xs h-7 gap-1"
          onClick={onOrderLabs}
        >
          <Plus className="size-3" />
          Order Tests
        </Button>
      </div>
      <p className="text-sm text-gray-400 text-center py-4">No lab orders on file.</p>
    </div>
  )
}

// ─── No-call placeholder ─────────────────────────────────────────────────────

function NoCallPlaceholder() {
  return (
    <div
      className="relative rounded-xl overflow-hidden bg-[#1a2332] w-full flex flex-col items-center justify-center"
      style={{ aspectRatio: '16/9' }}
    >
      <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
        <Video className="size-8 text-white/20" />
      </div>
      <p className="text-white/30 text-sm font-medium">No active call</p>
      <p className="text-white/20 text-xs mt-1">Click "Start Call" on a waiting patient</p>
    </div>
  )
}

// ─── Empty waiting room ───────────────────────────────────────────────────────

function EmptyWaitingRoom() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-10 px-4 text-center gap-2">
      <Users className="size-8 text-gray-300" />
      <p className="text-sm font-medium text-gray-500">No patients waiting</p>
      <p className="text-xs text-gray-400">Use "+ New Appointment" to add one</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TelehealthCenter({
  initialPatients = [],
  initialUpcoming = [],
}: TelehealthCenterProps) {
  const inCallPatient = initialPatients.find(
    (p) => p.status === 'in-call' && p.roomUrl && p.appointmentId
  )

  const [patients, setPatients] = useState<WaitingPatient[]>(initialPatients)
  const [activeId, setActiveId] = useState(
    inCallPatient?.id ?? initialPatients[0]?.id ?? ''
  )
  const [ddiVisible, setDdiVisible] = useState(false)
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(
    inCallPatient
      ? {
          appointmentId: inCallPatient.appointmentId!,
          roomUrl: inCallPatient.roomUrl!,
          roomName: inCallPatient.roomName!,
          patientName: inCallPatient.name,
          patientId: inCallPatient.id,
        }
      : null
  )
  const [startingCallForId, setStartingCallForId] = useState<string | null>(null)
  const [doctorId, setDoctorId] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [newRxOpen, setNewRxOpen] = useState(false)
  const [newLabOpen, setNewLabOpen] = useState(false)
  const [activePatient, setActivePatient] = useState<ActivePatientEHR | null>(null)
  const [ehrLoading, setEhrLoading] = useState(false)

  // Stable ref so the EHR effect can read current patients without re-running
  const patientsRef = useRef<WaitingPatient[]>(patients)
  useEffect(() => { patientsRef.current = patients }, [patients])

  // Fetch the logged-in clinician's identity once on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const uid = data.user.id
      setDoctorId(uid)
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', uid)
        .single()
        .then(({ data: profile }) => {
          setDoctorName(profile?.full_name ?? 'Your Doctor')
        })
    })
  }, [])

  // Fetch real EHR data whenever the selected patient changes
  useEffect(() => {
    if (!activeId) {
      setActivePatient(null)
      return
    }
    setEhrLoading(true)
    const supabase = createClient()
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    Promise.all([
      supabase
        .from('patients')
        .select('id, date_of_birth, gender, blood_type, blood_pressure, heart_rate, profile:profiles!profile_id(full_name)')
        .eq('id', activeId)
        .single(),
      supabase
        .from('prescriptions')
        .select('medication_name, dosage, frequency')
        .eq('patient_id', activeId)
        .eq('status', 'active')
        .limit(10),
      supabase
        .from('symptom_logs')
        .select('type, value, logged_at')
        .eq('patient_id', activeId)
        .gte('logged_at', fourteenDaysAgo)
        .order('logged_at', { ascending: false })
        .limit(50),
    ])
      .then(([{ data: pt, error: ptErr }, { data: rxRows, error: rxErr }, { data: symRows }]) => {
        if (ptErr) console.error('[EHR] patients query failed — code:', ptErr.code)
        if (rxErr) console.error('[EHR] prescriptions query failed — code:', rxErr.code)
        if (!pt) { setActivePatient(null); return }
        type RawPt = {
          id: string
          date_of_birth: string | null
          gender: string | null
          blood_type: string | null
          blood_pressure: string | null
          heart_rate: number | null
          profile: { full_name: string } | { full_name: string }[] | null
        }
        type RawRx = { medication_name: string; dosage: string; frequency: string }
        type RawSym = { type: string; value: number; logged_at: string }
        const rawPt = pt as RawPt
        const profileObj = rawPt.profile
          ? (Array.isArray(rawPt.profile) ? rawPt.profile[0] : rawPt.profile)
          : null
        const name = profileObj?.full_name ?? 'Unknown'
        const dob = rawPt.date_of_birth ? new Date(rawPt.date_of_birth) : null
        const rawAge = dob
          ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
          : null
        const age = rawAge != null && rawAge >= 0 && rawAge <= 120 ? rawAge : null
        const apptId = patientsRef.current.find((p) => p.id === activeId)?.appointmentId ?? ''

        // Compute headache trend: compare count in last 7 days vs prior 7 days
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const symptoms = (symRows as RawSym[] ?? [])
        const headaches = symptoms.filter((r) => r.type === 'headache')
        const recent7 = headaches.filter((r) => new Date(r.logged_at).getTime() >= sevenDaysAgo).length
        const prev7 = headaches.filter((r) => new Date(r.logged_at).getTime() < sevenDaysAgo).length
        const headacheLogTrend = (recent7 > 0 || prev7 > 0)
          ? {
              direction: (recent7 >= prev7 ? 'up' : 'down') as 'up' | 'down',
              percentage: prev7 === 0 ? 100 : Math.round(Math.abs(recent7 - prev7) / prev7 * 100),
            }
          : null

        // Compute sleep quality: average of last 7 sleep entries (1=POOR, 2=FAIR, 3=GOOD)
        const sleepEntries = symptoms.filter((r) => r.type === 'sleep').slice(0, 7)
        let sleepQuality: 'GOOD' | 'FAIR' | 'POOR' | null = null
        if (sleepEntries.length > 0) {
          const avg = sleepEntries.reduce((s, r) => s + r.value, 0) / sleepEntries.length
          sleepQuality = avg >= 2.5 ? 'GOOD' : avg >= 1.5 ? 'FAIR' : 'POOR'
        }

        setActivePatient({
          id: activeId,
          appointmentId: apptId,
          name,
          age,
          gender: rawPt.gender ?? '—',
          bloodType: rawPt.blood_type ?? '—',
          bloodPressure: rawPt.blood_pressure ?? '—',
          heartRate: rawPt.heart_rate ?? null,
          allergies: [],
          diagnoses: [],
          labs: [],
          medications: (rxRows as RawRx[] ?? []).map((rx) => ({
            name: rx.medication_name,
            dose: rx.dosage,
            frequency: rx.frequency,
          })),
          conditions: [],
          headacheLogTrend,
          sleepQuality,
        })
      })
      .finally(() => setEhrLoading(false))
  }, [activeId])

  const waitingCount = patients.length

  const handleStartCall = async (patient: WaitingPatient) => {
    if (!patient.appointmentId) {
      toast.error('No appointment ID for this patient')
      return
    }
    if (!doctorId || !doctorName) {
      toast.error('Loading clinician profile, please try again in a moment')
      return
    }
    setStartingCallForId(patient.id)
    try {
      const res = await fetch('/api/telehealth/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: patient.appointmentId,
          patientId: patient.id,
          doctorId: doctorId || 'doctor',
          doctorName,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to create call room')
      }
      const { roomUrl, roomName } = await res.json()
      setActiveCall({
        appointmentId: patient.appointmentId,
        roomUrl,
        roomName,
        patientName: patient.name,
        patientId: patient.id,
      })
      setActiveId(patient.id)
      toast.success(`Call started — waiting for ${patient.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start call')
    } finally {
      setStartingCallForId(null)
    }
  }

  const handleCallEnded = () => {
    setActiveCall(null)
  }

  const handleEndStuckCall = async (patient: WaitingPatient) => {
    if (!patient.appointmentId) return
    try {
      await fetch('/api/telehealth/end-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: patient.appointmentId,
          roomName: patient.roomName ?? `medisync-${patient.appointmentId}`,
          patientId: patient.id,
        }),
      })
      setPatients((prev) => prev.filter((p) => p.id !== patient.id))
      if (activeCall?.appointmentId === patient.appointmentId) setActiveCall(null)
      toast.success(`${patient.name}'s call ended`)
    } catch {
      toast.error('Failed to end call')
    }
  }

  return (
    <>
      <DDIWarningBanner
        visible={ddiVisible}
        drugA="Sumatriptan"
        drugB="Sertraline"
        severity="moderate"
        description="Concurrent use may increase risk of serotonin syndrome. Monitor patient closely for agitation, confusion, and rapid heart rate."
        onOverride={(code) => {
          toast.success(`Override recorded — code ${code}`)
          setDdiVisible(false)
        }}
        onCancel={() => setDdiVisible(false)}
      />

      <NewAppointmentModal
        open={newApptOpen}
        onClose={() => setNewApptOpen(false)}
        clinicianId={doctorId}
        onCreated={(newPatient) => {
          setPatients((prev) => {
            if (prev.some((p) => p.id === newPatient.id)) {
              toast.error(`${newPatient.name} is already in the waiting room`)
              return prev
            }
            return [...prev, newPatient]
          })
          setNewApptOpen(false)
          toast.success(`${newPatient.name} added to the waiting room`)
        }}
      />

      {activePatient && (
        <NewLabOrderModal
          open={newLabOpen}
          onClose={() => setNewLabOpen(false)}
          patientId={activePatient.id}
          clinicianId={doctorId}
          onSuccess={() => setNewLabOpen(false)}
        />
      )}

      {activePatient && (
        <NewPrescriptionModal
          open={newRxOpen}
          onClose={() => setNewRxOpen(false)}
          patientId={activePatient.id}
          doctorId={doctorId}
          onSuccess={() => {
            setNewRxOpen(false)
            // Re-fetch medications for the active patient
            const supabase = createClient()
            supabase
              .from('prescriptions')
              .select('medication_name, dosage, frequency')
              .eq('patient_id', activePatient.id)
              .eq('status', 'active')
              .limit(10)
              .then(({ data }) => {
                if (!data) return
                setActivePatient((prev) =>
                  prev
                    ? {
                        ...prev,
                        medications: data.map((rx) => ({
                          name: rx.medication_name,
                          dose: rx.dosage,
                          frequency: rx.frequency,
                        })),
                      }
                    : prev
                )
              })
          }}
        />
      )}

      <div className="flex h-full bg-[#F4F6F8] overflow-hidden">
        {/* ── Left Panel — Waiting Room ── */}
        <div className="w-[280px] bg-white border-r border-gray-100 flex flex-col shrink-0">
          <div className="px-4 pt-5 pb-3 flex items-center justify-between border-b border-gray-100 shrink-0">
            <span className="text-sm font-bold text-gray-900">Waiting Room</span>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
              {waitingCount} PATIENTS
            </span>
          </div>

          <div className="overflow-y-auto flex-1 px-2 py-2 flex flex-col">
            {patients.length === 0 ? (
              <EmptyWaitingRoom />
            ) : (
              patients.map((patient) => (
                <WaitingRoomCard
                  key={patient.appointmentId ?? patient.id}
                  {...patient}
                  isActive={patient.id === activeId}
                  onClick={() => setActiveId(patient.id)}
                  onStartCall={() => handleStartCall(patient)}
                  onEndCall={() => handleEndStuckCall(patient)}
                  isStartingCall={startingCallForId === patient.id || !doctorId}
                />
              ))
            )}

            {/* Upcoming appointments */}
            {initialUpcoming.length > 0 && (
              <div className="mt-4 px-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-2">
                  Upcoming Appointments
                </p>
                <div className="space-y-2">
                  {initialUpcoming.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-xs font-bold text-[#0D6B5E] min-w-[48px] shrink-0 mt-0.5">
                        {slot.time}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {slot.patientName}
                        </p>
                        <p className="text-[10px] text-gray-400">{slot.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-3 pb-4 pt-2 border-t border-gray-100 shrink-0">
            <Button
              className="w-full bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white gap-1.5 text-sm"
              onClick={() => setNewApptOpen(true)}
            >
              <Plus className="size-4" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* ── Center Panel — Video + Notes ── */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4 min-w-0">
          {activeCall ? (
            <VideoCallPanel
              appointmentId={activeCall.appointmentId}
              doctorName={doctorName}
              roomName={activeCall.roomName}
              onCallEnded={handleCallEnded}
            />
          ) : (
            <NoCallPlaceholder />
          )}

          {/* Tabbed notes + EHR */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0">
            <Tabs defaultValue="notes" className="flex flex-col h-full">
              <div className="px-4 pt-3 border-b border-gray-100 shrink-0">
                <TabsList variant="line" className="gap-4">
                  <TabsTrigger value="notes" className="text-xs gap-1.5">
                    <ClipboardList className="size-3.5" />
                    Clinical Notes
                  </TabsTrigger>
                  <TabsTrigger value="ehr" className="text-xs gap-1.5">
                    EHR Summary
                  </TabsTrigger>
                  <TabsTrigger value="rx" className="text-xs gap-1.5">
                    <Pill className="size-3.5" />
                    Prescriptions
                  </TabsTrigger>
                  <TabsTrigger value="labs" className="text-xs gap-1.5">
                    <FlaskConical className="size-3.5" />
                    Lab Orders
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="notes" className="p-4 m-0">
                  {activePatient ? (
                    <ClinicalNotes
                      patientId={activePatient.id}
                      appointmentId={activeCall?.appointmentId ?? activePatient.appointmentId}
                      initialConditions={activePatient.conditions}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                      <ClipboardList className="size-8 opacity-30" />
                      <p className="text-sm">Select a patient to write clinical notes</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="ehr" className="p-4 m-0">
                  <EHRSummaryTab patient={activePatient} />
                </TabsContent>

                <TabsContent value="rx" className="p-4 m-0">
                  <PrescriptionsTab
                    patient={activePatient}
                    onNewPrescription={() => setNewRxOpen(true)}
                  />
                </TabsContent>

                <TabsContent value="labs" className="p-4 m-0">
                  <LabOrdersTab
                    patient={activePatient}
                    onOrderLabs={() => setNewLabOpen(true)}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* ── Right Panel — Patient EHR ── */}
        <div className="w-[300px] bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden">
          {activePatient ? (
            <PatientEHRPanel
              name={activePatient.name}
              age={activePatient.age}
              gender={activePatient.gender}
              bloodType={activePatient.bloodType}
              bloodPressure={activePatient.bloodPressure}
              heartRate={activePatient.heartRate}
              allergies={activePatient.allergies}
              diagnoses={activePatient.diagnoses}
              labs={activePatient.labs}
              medications={activePatient.medications}
              careAlert={activePatient.careAlert}
              headacheLogTrend={activePatient.headacheLogTrend}
              sleepQuality={activePatient.sleepQuality}
            />
          ) : (
            <div className="flex flex-col h-full">
              <div className="px-4 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Patient EHR</p>
              </div>
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
                {ehrLoading ? (
                  <p className="text-sm">Loading…</p>
                ) : (
                  <>
                    <Users className="size-10 opacity-20" />
                    <p className="text-sm text-center px-4">
                      {patients.length === 0
                        ? 'No patients in the waiting room'
                        : 'Select a patient to view their EHR'}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
