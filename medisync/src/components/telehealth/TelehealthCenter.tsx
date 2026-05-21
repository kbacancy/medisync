'use client'

import { useState } from 'react'
import { Plus, Pill, ClipboardList, FlaskConical } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WaitingRoomCard } from './WaitingRoomCard'
import { VideoCallPanel } from './VideoCallPanel'
import { ClinicalNotes } from './ClinicalNotes'
import { PatientEHRPanel } from './PatientEHRPanel'
import { DDIWarningBanner } from './DDIWarningBanner'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaitingPatient {
  id: string
  name: string
  initials: string
  reason: string
  status: 'waiting' | 'in-call'
  waitMinutes?: number
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

interface TelehealthCenterProps {
  initialPatients?: WaitingPatient[]
  initialUpcoming?: UpcomingSlot[]
  initialActivePatient?: ActivePatientEHR
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_WAITING: WaitingPatient[] = [
  { id: 'p1', name: 'Emma Richardson', initials: 'ER', reason: 'Follow-up: Migraine', status: 'in-call' },
  { id: 'p2', name: 'James Kim',        initials: 'JK', reason: 'Chest Pain Assessment', status: 'waiting', waitMinutes: 8  },
  { id: 'p3', name: 'Priya Patel',      initials: 'PP', reason: 'Diabetes Check-in',    status: 'waiting', waitMinutes: 15 },
  { id: 'p4', name: 'Carlos Rivera',    initials: 'CR', reason: 'Post-Surgery Review',  status: 'waiting', waitMinutes: 23 },
]

const SEED_UPCOMING: UpcomingSlot[] = [
  { id: 'u1', time: '2:30 PM', doctorName: 'Dr. Sarah Johnson', specialty: 'Cardiology'       },
  { id: 'u2', time: '3:00 PM', doctorName: 'Dr. Michael Brown',  specialty: 'Neurology'        },
  { id: 'u3', time: '3:45 PM', doctorName: 'Dr. Lisa Chen',      specialty: 'General Medicine' },
]

const SEED_ACTIVE: ActivePatientEHR = {
  id: 'p1',
  appointmentId: 'appt-1',
  name: 'Emma Richardson',
  age: 34,
  gender: 'Female',
  bloodType: 'A+',
  bloodPressure: '120/80',
  heartRate: 72,
  allergies: ['Penicillin', 'Aspirin'],
  diagnoses: ['Chronic Migraine', 'Hypertension'],
  labs: [
    { name: 'CBC',        value: 'Normal',   date: '2 wks ago' },
    { name: 'Lipid Panel', value: '184 mg/dL', date: '1 mo ago' },
    { name: 'HbA1c',      value: '5.4%',     date: '3 mo ago' },
  ],
  medications: [
    { name: 'Sumatriptan',  dose: '50 mg',  frequency: 'As needed'  },
    { name: 'Metoprolol',   dose: '25 mg',  frequency: 'Once daily' },
    { name: 'Topiramate',   dose: '100 mg', frequency: 'Twice daily'},
  ],
  careAlert: 'Patient reported high pain intensity via portal 2h ago.',
  conditions: ['MIGRAINE', 'NEUROLOGY', 'HYPERTENSION'],
}

// ─── EHR Summary (center tab) ─────────────────────────────────────────────────

function EHRSummaryTab({ patient }: { patient: ActivePatientEHR }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Allergies</p>
        <div className="flex gap-1.5 flex-wrap">
          {patient.allergies.map((a) => (
            <span key={a} className="text-xs px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded font-medium">
              {a}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Past Diagnoses</p>
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
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Recent Lab Results</p>
        <div className="space-y-1.5">
          {patient.labs.map((lab) => (
            <div key={lab.name} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
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

// ─── Prescriptions Tab ────────────────────────────────────────────────────────

function PrescriptionsTab({ patient }: { patient: ActivePatientEHR }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-900">Active Prescriptions</p>
        <Button size="sm" className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white text-xs h-7 gap-1">
          <Plus className="size-3" />
          New Prescription
        </Button>
      </div>
      {patient.medications.map((med, i) => (
        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function TelehealthCenter({
  initialPatients = SEED_WAITING,
  initialUpcoming = SEED_UPCOMING,
  initialActivePatient = SEED_ACTIVE,
}: TelehealthCenterProps) {
  const [activeId, setActiveId] = useState(initialPatients.find((p) => p.status === 'in-call')?.id ?? initialPatients[0]?.id)
  const [ddiVisible, setDdiVisible] = useState(false)

  const activePatient = initialActivePatient

  const waitingCount = initialPatients.filter((p) => p.status === 'waiting').length + initialPatients.filter((p) => p.status === 'in-call').length

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
        {/* ── Left Panel ── */}
        <div className="w-[280px] bg-white border-r border-gray-100 flex flex-col shrink-0">
          {/* Waiting Room header */}
          <div className="px-4 pt-5 pb-3 flex items-center justify-between border-b border-gray-100 shrink-0">
            <span className="text-sm font-bold text-gray-900">Waiting Room</span>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
              {waitingCount} PATIENTS
            </span>
          </div>

          {/* Waiting patients */}
          <div className="overflow-y-auto flex-1 px-2 py-2">
            {initialPatients.map((patient) => (
              <WaitingRoomCard
                key={patient.id}
                {...patient}
                isActive={patient.id === activeId}
                onClick={() => setActiveId(patient.id)}
              />
            ))}

            {/* Upcoming appointments */}
            <div className="mt-4 px-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-2">
                Upcoming Appointments
              </p>
              <div className="space-y-2">
                {initialUpcoming.map((slot) => (
                  <div key={slot.id} className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-50">
                    <span className="text-xs font-bold text-[#0D6B5E] min-w-[48px] shrink-0 mt-0.5">
                      {slot.time}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{slot.doctorName}</p>
                      <p className="text-[10px] text-gray-400">{slot.specialty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New appointment button */}
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

        {/* ── Center Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4 min-w-0">
          {/* Video */}
          <VideoCallPanel patientName={activePatient.name} sessionDuration={764} />

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
                    appointmentId={activePatient.appointmentId}
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

        {/* ── Right Panel ── */}
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
