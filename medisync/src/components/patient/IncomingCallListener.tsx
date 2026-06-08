'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  clinician_id: string | null
}

/**
 * Three-pronged call alert system for iOS PWA and other platforms:
 *
 *  1. Supabase Realtime — instant when the DB publication is configured.
 *  2. 5 s polling (visibility-aware) — reliable fallback when realtime isn't
 *     available (e.g. migration not yet applied on the live DB).
 *  3. SW postMessage — when a push notification arrives and the app is open,
 *     the service worker posts a CALL_STARTED message so the banner appears
 *     immediately without waiting for the next poll cycle.
 *
 * All three paths converge on setActiveCall(), so they never duplicate.
 */
export function IncomingCallListener({ patientId }: IncomingCallListenerProps) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const activeCallIdRef = useRef<string | null>(null)

  // ─── Shared helpers ────────────────────────────────────────────────────────

  const resolveCall = useCallback(
    async (row: AppointmentRow): Promise<ActiveCall> => {
      const supabase = createClient()
      let doctorName = 'your doctor'
      if (row.clinician_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', row.clinician_id)
          .single()
        if (profile?.full_name) doctorName = profile.full_name
      }
      return {
        id: row.id,
        room_url: row.room_url!,
        room_name: row.room_name!,
        doctorName,
      }
    },
    []
  )

  /**
   * Fetches the current call state from the DB and syncs the banner.
   * Safe to call repeatedly — only triggers a state update when something changed.
   */
  const syncCallState = useCallback(async () => {
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('appointments')
      .select('id, status, type, room_url, room_name, clinician_id')
      .eq('patient_id', patientId)
      .eq('status', 'in-call')
      .eq('type', 'telehealth')
      .not('room_url', 'is', null)
      .limit(1)

    const row = rows?.[0] as AppointmentRow | undefined

    if (row?.room_url && row.room_name) {
      if (activeCallIdRef.current !== row.id) {
        const call = await resolveCall(row)
        activeCallIdRef.current = call.id
        setActiveCall(call)
      }
    } else if (activeCallIdRef.current) {
      // Call ended — dismiss the banner
      activeCallIdRef.current = null
      setActiveCall(null)
    }
  }, [patientId, resolveCall])

  // ─── Path 1: Supabase Realtime ─────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient()

    // Initial check: catches the case where the doctor started the call before
    // the patient opened the app (realtime only delivers future events).
    syncCallState()

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
            const call = await resolveCall(row)
            activeCallIdRef.current = call.id
            setActiveCall(call)
          } else if (activeCallIdRef.current === row.id) {
            activeCallIdRef.current = null
            setActiveCall(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId, syncCallState, resolveCall])

  // ─── Path 2: Polling fallback (visibility-aware) ───────────────────────────
  // Runs every 5 s when the page is visible. This makes the banner reliable
  // even when Supabase Realtime isn't configured on the live DB.

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    function startPolling() {
      if (interval) return
      interval = setInterval(syncCallState, 5_000)
    }

    function stopPolling() {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        // Immediate sync when the app comes back to the foreground, then poll
        syncCallState()
        startPolling()
      } else {
        stopPolling()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    if (document.visibilityState === 'visible') startPolling()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      stopPolling()
    }
  }, [syncCallState])

  // ─── Path 3: SW → client postMessage ──────────────────────────────────────
  // When a push notification with type='call_started' is delivered, the service
  // worker posts CALL_STARTED to all open windows. This triggers the banner
  // instantly even while the app is in the foreground.

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function handleSWMessage(event: MessageEvent) {
      if (event.data?.type !== 'CALL_STARTED') return
      const { appointmentId, roomUrl, roomName, doctorName } =
        (event.data.payload as {
          appointmentId: string
          roomUrl: string
          roomName: string
          doctorName: string
        }) ?? {}
      if (!appointmentId || !roomUrl || !roomName) return

      if (activeCallIdRef.current !== appointmentId) {
        activeCallIdRef.current = appointmentId
        setActiveCall({
          id: appointmentId,
          room_url: roomUrl,
          room_name: roomName,
          doctorName: doctorName || 'your doctor',
        })
      }
    }

    navigator.serviceWorker.addEventListener('message', handleSWMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage)
    }
  }, [])

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
