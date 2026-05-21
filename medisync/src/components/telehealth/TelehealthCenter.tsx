'use client'

import { useState, useEffect } from 'react'
import { Plus, Pill, ClipboardList, FlaskConical, Video } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { WaitingRoomCard } from './WaitingRoomCard'
import { VideoCallPanel } from './VideoCallPanel'
import { ClinicalNotes } from './ClinicalNotes'
import { PatientEHRPanel } from './PatientEHRPanel'
import { DDIWarningBanner } from './DDIWarningBanner'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaitingPatient {
  id: string
  name: string
  initials: string
  reason: string
  status: 'waiting' | 'in-call'
  waitMinutes?: number
  appointmentId?: string
}

interface UpcomingSlot {
  id: string
  time: string
  doctorName: string
  specialty: string
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
  age: number
  gender: string
  bloodType: string
  bloodPressure: string
  heartRate: number
  allergies: string[]
  diagnoses: string[]
  labs: EHRLab[]
  medications: EHRMedication[]
  careAlert?: string
  conditions: string[]
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
  initialActivePatient?: ActivePatientEHR
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_WAITING: WaitingPatient[] = [
  { id: 'p1', name: 'Emma Richardson', initials: 'ER', reason: 'Follow-up: Migraine',   status: 'waiting', waitMinutes: 3,  appointmentId: 'appt-seed-1' },
  { id: 'p2', name: 'James Kim',        initials: 'JK', reason: 'Chest Pain Assessment', status: 'waiting', waitMinutes: 8,  appointmentId: 'appt-seed-2' },
  { id: 'p3', name: 'Priya Patel',      initials: 'PP', reason: 'Diabetes Check-in',     status: 'waiting', waitMinutes: 15, appointmentId: 'appt-seed-3' },
  { id: 'p4', name: 'Carlos Rivera',    initials: 'CR', reason: 'Post-Surgery Review',   status: 'waiting', waitMinutes: 23, appointmentId: 'appt-seed-4' },
]

const SEED_UPCOMING: UpcomingSlot[] = [
  { id: 'u1', time: '2:30 PM', doctorName: 'Dr. Sarah Johnson', specialty: 'Cardiology'       },
  { id: 'u2', time: '3:00 PM', doctorName: 'Dr. Michael Brown',  specialty: 'Neurology'        },
  { id: 'u3', time: '3:45 PM', doctorName: 'Dr. Lisa Chen',      specialty: 'General Medicine' },
]

const SEED_ACTIVE: ActivePatientEHR = {
  id: 'p1',
  appointmentId: 'appt-seed-1',
  name: 'Emma Richardson',
  age: 34,
  gender: 'Female',
  bloodType: 'A+',
  bloodPressure: '120/80',
  heartRate: 72,
  allergies: ['Penicillin', 'Aspirin'],
  diagnoses: ['Chronic Migraine', 'Hypertension'],
  labs: [
    { name: 'CBC',         value: 'Normal',    date: '2 wks ago' },
    { name: 'Lipid Panel', value: '184 mg/dL', date: '1 mo ago'  },
    { name: 'HbA1c',       value: '5.4%',      date: '3 mo ago'  },
  ],
  medications: [
    { name: 'Sumatriptan', dose: '50 mg',  frequency: 'As needed'   },
    { name: 'Metoprolol',  dose: '25 mg',  frequency: 'Once daily'  },
    { name: 'Topiramate',  dose: '100 mg', frequency: 'Twice daily' },
  ],
  careAlert: 'Patient reported high pain intensity via portal 2h ago.',
  conditions: ['MIGRAINE', 'NEUROLOGY', 'HYPERTENSION'],
}

// ─── EHR Summary tab ──────────────────────────────────────────────────────────

function EHRSummaryTab({ patient }: { patient: ActivePatientEHR }) {
  return (
    <div className="space-y-4">
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
    </div>
  )
}

// ─── Prescriptions tab ────────────────────────────────────────────────────────

function PrescriptionsTab({ patient }: { patient: ActivePatientEHR }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-900">Active Prescriptions</p>
        <Button
          size="sm"
          className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white text-xs h-7 gap-1"
        >
          <Plus className="size-3" />
          New Prescription
        </Button>
      </div>
      {patient.medications.map((med, i) => (
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
      ))}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function TelehealthCenter({
  initialPatients = SEED_WAITING,
  initialUpcoming = SEED_UPCOMING,
  initialActivePatient = SEED_ACTIVE,
}: TelehealthCenterProps) {
  const [activeId, setActiveId] = useState(
    initialPatients[0]?.id ?? ''
  )
  const [ddiVisible, setDdiVisible] = useState(false)
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [startingCallForId, setStartingCallForId] = useState<string | null>(null)
  const [doctorId, setDoctorId] = useState('')
  const [doctorName, setDoctorName] = useState('Doctor')

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
          if (profile?.full_name) setDoctorName(profile.full_name)
        })
    })
  }, [])

  const activePatient = initialActivePatient
  const waitingCount = initialPatients.length

  const handleStartCall = async (patient: WaitingPatient) => {
    if (!patient.appointmentId) {
      toast.error('No appointment ID for this patient')
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

      <div className="flex h-full bg-[#F4F6F8] overflow-hidden">
        {/* ── Left Panel — Waiting Room ── */}
        <div className="w-[280px] bg-white border-r border-gray-100 flex flex-col shrink-0">
          <div className="px-4 pt-5 pb-3 flex items-center justify-between border-b border-gray-100 shrink-0">
            <span className="text-sm font-bold text-gray-900">Waiting Room</span>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
              {waitingCount} PATIENTS
            </span>
          </div>

          <div className="overflow-y-auto flex-1 px-2 py-2">
            {initialPatients.map((patient) => (
              <WaitingRoomCard
                key={patient.id}
                {...patient}
                isActive={patient.id === activeId}
                onClick={() => setActiveId(patient.id)}
                onStartCall={() => handleStartCall(patient)}
                isStartingCall={startingCallForId === patient.id}
              />
            ))}

            {/* Upcoming appointments */}
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
                        {slot.doctorName}
                      </p>
                      <p className="text-[10px] text-gray-400">{slot.specialty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-3 pb-4 pt-2 border-t border-gray-100 shrink-0">
            <Button
              className="w-full bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white gap-1.5 text-sm"
              onClick={() => toast.info('New appointment — coming in Phase 4')}
            >
              <Plus className="size-4" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* ── Center Panel — Video + Notes ── */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4 min-w-0">
          {/* Video area — real call or placeholder */}
          {activeCall ? (
            <VideoCallPanel
              appointmentId={activeCall.appointmentId}
              patientName={activeCall.patientName}
              doctorName={doctorName}
              doctorId={doctorId}
              roomUrl={activeCall.roomUrl}
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
                    <FlaskConical className="size-3.5" />
                    Prescriptions
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="notes" className="p-4 m-0">
                  <ClinicalNotes
                    patientId={activePatient.id}
                    appointmentId={activeCall?.appointmentId ?? activePatient.appointmentId}
                    initialConditions={activePatient.conditions}
                  />
                </TabsContent>

                <TabsContent value="ehr" className="p-4 m-0">
                  <EHRSummaryTab patient={activePatient} />
                </TabsContent>

                <TabsContent value="rx" className="p-4 m-0">
                  <PrescriptionsTab patient={activePatient} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* ── Right Panel — Patient EHR ── */}
        <div className="w-[300px] bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden">
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
          />
        </div>
      </div>
    </>
  )
}
