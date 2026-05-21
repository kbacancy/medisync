'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WaitingRoomCard } from './WaitingRoomCard'
import { cn } from '@/lib/utils'

interface WaitingPatient {
  id: string
  name: string
  initials: string
  reason: string
  status: 'waiting' | 'in-call'
  waitMinutes?: number
  appointmentId?: string
}

interface WaitingRoomRealtimeProps {
  initialPatients?: WaitingPatient[]
  doctorId: string
  activePatientId?: string
  onSelectPatient?: (patient: WaitingPatient) => void
}

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function minutesWaiting(scheduledAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(scheduledAt).getTime()) / 60_000))
}

export function WaitingRoomRealtime({
  initialPatients = [],
  doctorId,
  activePatientId,
  onSelectPatient,
}: WaitingRoomRealtimeProps) {
  const [patients, setPatients] = useState<WaitingPatient[]>(initialPatients)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [entering, setEntering] = useState<Set<string>>(new Set())
  const [leaving, setLeaving] = useState<Set<string>>(new Set())
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`waiting-room-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinician_id=eq.${doctorId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const appt = payload.new as Record<string, unknown>
            const apptStatus = appt.status as string
            if (apptStatus !== 'waiting' && apptStatus !== 'in-call') return

            const patientName = (appt.patient_name as string | undefined) ?? 'Patient'
            const newPatient: WaitingPatient = {
              id: appt.patient_id as string,
              name: patientName,
              initials: getInitials(patientName),
              reason: (appt.reason as string) ?? 'Appointment',
              status: apptStatus as 'waiting' | 'in-call',
              waitMinutes: minutesWaiting(appt.scheduled_at as string),
              appointmentId: appt.id as string,
            }

            setEntering((prev) => new Set(prev).add(newPatient.id))
            setPatients((prev) => [newPatient, ...prev])

            setTimeout(() => {
              setEntering((prev) => {
                const next = new Set(prev)
                next.delete(newPatient.id)
                return next
              })
            }, 600)
          }

          if (payload.eventType === 'UPDATE') {
            const appt = payload.new as Record<string, unknown>
            const apptStatus = appt.status as string

            setPatients((prev) =>
              prev.map((p) =>
                p.id === (appt.patient_id as string)
                  ? { ...p, status: apptStatus as 'waiting' | 'in-call' }
                  : p
              )
            )
          }

          if (payload.eventType === 'DELETE') {
            const appt = payload.old as Record<string, unknown>
            const removedId = appt.patient_id as string

            setLeaving((prev) => new Set(prev).add(removedId))
            setTimeout(() => {
              setPatients((prev) => prev.filter((p) => p.id !== removedId))
              setLeaving((prev) => {
                const next = new Set(prev)
                next.delete(removedId)
                return next
              })
            }, 400)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnection('connected')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnection('reconnecting')
        } else if (status === 'CLOSED') {
          setConnection('disconnected')
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [doctorId])

  return (
    <div className="flex flex-col h-full">
      {/* Header with Live indicator */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Waiting Room
        </h3>
        <div className="flex items-center gap-1.5">
          {connection === 'connected' ? (
            <>
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-green-500" />
              </span>
              <span className="text-[11px] font-medium text-green-600">Live</span>
            </>
          ) : connection === 'reconnecting' ? (
            <>
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-medium text-amber-600">Reconnecting…</span>
            </>
          ) : (
            <>
              <span className="size-2 rounded-full bg-gray-300" />
              <span className="text-[11px] font-medium text-gray-400">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Patient list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {patients.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No patients waiting</p>
        ) : (
          patients.map((patient) => (
            <div
              key={patient.id}
              className={cn(
                'transition-all duration-300',
                entering.has(patient.id) &&
                  'animate-in slide-in-from-top-2 fade-in duration-300',
                leaving.has(patient.id) && 'opacity-0 translate-y-1 duration-300'
              )}
            >
              <WaitingRoomCard
                id={patient.id}
                name={patient.name}
                initials={patient.initials}
                reason={patient.reason}
                status={patient.status}
                waitMinutes={patient.waitMinutes}
                isActive={patient.id === activePatientId}
                onClick={() => onSelectPatient?.(patient)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
