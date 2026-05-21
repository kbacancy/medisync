'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import type { CareAlert } from '@/types'

interface CareAlertsRealtimeProps {
  doctorId: string
}

function getToastIcon(severity: CareAlert['severity']) {
  if (severity === 'high' || severity === 'critical')
    return <AlertTriangle className="size-4 text-red-500 shrink-0" />
  if (severity === 'moderate')
    return <AlertCircle className="size-4 text-amber-500 shrink-0" />
  return <Info className="size-4 text-blue-500 shrink-0" />
}

function showAlertToast(alert: CareAlert) {
  const isHighSeverity = alert.severity === 'high' || alert.severity === 'critical'
  const isModerate = alert.severity === 'moderate'

  const content = (
    <div className="flex items-start gap-2">
      {getToastIcon(alert.severity)}
      <span className="text-sm leading-snug">{alert.message}</span>
    </div>
  )

  if (isHighSeverity) {
    toast.error(content, { duration: 8000 })
  } else if (isModerate) {
    toast.warning(content, { duration: 6000 })
  } else {
    toast.info(content, { duration: 5000 })
  }
}

/**
 * Invisible component — subscribes to care_alerts and shows toast notifications.
 * Must be mounted inside a layout that has access to the current doctor's ID.
 */
export function CareAlertsRealtime({ doctorId }: CareAlertsRealtimeProps) {
  const addAlert = useNotificationStore((s) => s.addAlert)
  const patientIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    // Pre-fetch doctor's patient IDs for client-side filtering
    supabase
      .from('patients')
      .select('id')
      .then(({ data }) => {
        // If we can determine which patients belong to this doctor via appointments
        supabase
          .from('appointments')
          .select('patient_id')
          .eq('clinician_id', doctorId)
          .then(({ data: apptData }) => {
            if (apptData) {
              apptData.forEach((row) => patientIdsRef.current.add(row.patient_id as string))
            }
            // Fallback: show all alerts if no appointment data
            if (patientIdsRef.current.size === 0 && data) {
              data.forEach((row) => patientIdsRef.current.add(row.id as string))
            }
          })
      })

    const channel = supabase
      .channel(`care-alerts-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'care_alerts',
        },
        (payload) => {
          const alert = payload.new as CareAlert

          // Filter to doctor's patients (or show all if list not loaded yet)
          if (
            patientIdsRef.current.size > 0 &&
            !patientIdsRef.current.has(alert.patient_id)
          ) {
            return
          }

          addAlert(alert)
          showAlertToast(alert)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [doctorId, addAlert])

  return null
}
