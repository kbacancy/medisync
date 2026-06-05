'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ActiveCallBanner } from './ActiveCallBanner'

interface IncomingCallListenerProps {
  patientId: string
}

interface ActiveCall {
  id: string
  room_url: string
  room_name: string
  doctorName: string
}

interface AppointmentRow {
  id: string
  status: string
  type: string
  room_url: string | null
  room_name: string | null
  doctor_id: string | null
}

/**
 * Real-time fallback for platforms where push notifications are unavailable
 * (iOS Safari in non-standalone mode, browsers that denied permission, etc.).
 *
 * Subscribes to Supabase Realtime and shows an incoming-call banner as soon as
 * the clinician starts the call — no page refresh or push notification required.
 */
export function IncomingCallListener({ patientId }: IncomingCallListenerProps) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  // Ref so the Realtime callback can read the latest active call ID without
  // being included in the effect dependency array (which would re-subscribe).
  const activeCallIdRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`incoming-call-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${patientId}`,
        },
        async (payload) => {
          const row = payload.new as AppointmentRow

          if (
            row.status === 'in-call' &&
            row.type === 'telehealth' &&
            row.room_url &&
            row.room_name
          ) {
            let doctorName = 'your doctor'
            if (row.doctor_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', row.doctor_id)
                .single()
              if (profile?.full_name) doctorName = profile.full_name
            }
            const call: ActiveCall = {
              id: row.id,
              room_url: row.room_url,
              room_name: row.room_name,
              doctorName,
            }
            activeCallIdRef.current = row.id
            setActiveCall(call)
          } else if (activeCallIdRef.current === row.id) {
            // This appointment moved out of 'in-call' — dismiss the banner
            activeCallIdRef.current = null
            setActiveCall(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId])

  if (!activeCall) return null

  return (
    <ActiveCallBanner
      appointmentId={activeCall.id}
      roomUrl={activeCall.room_url}
      roomName={activeCall.room_name}
      doctorName={activeCall.doctorName}
    />
  )
}
