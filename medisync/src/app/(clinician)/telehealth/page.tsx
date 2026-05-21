import { createClient as createServiceClient } from '@supabase/supabase-js'
import { TelehealthCenter } from '@/components/telehealth/TelehealthCenter'
import type { WaitingPatient } from '@/components/telehealth/TelehealthCenter'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function TelehealthPage() {
  const supabase = getServiceClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const { data } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_at,
      reason,
      status,
      patient:patients!patient_id(
        id,
        profile:profiles!profile_id(full_name)
      )
    `)
    .eq('type', 'telehealth')
    .in('status', ['scheduled', 'in-call'])
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at')

  type RawAppt = {
    id: string
    scheduled_at: string
    reason: string
    status: string
    patient: {
      id: string
      profile: { full_name: string } | { full_name: string }[] | null
    } | {
      id: string
      profile: { full_name: string } | { full_name: string }[] | null
    }[] | null
  }

  function getInitials(name: string) {
    return name.split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('')
  }

  const waiting: WaitingPatient[] | undefined =
    data && data.length > 0
      ? (data as RawAppt[]).map((row) => {
          const patientRec = Array.isArray(row.patient) ? row.patient[0] : row.patient
          const profileObj = patientRec?.profile
            ? (Array.isArray(patientRec.profile) ? patientRec.profile[0] : patientRec.profile)
            : null
          const name = profileObj?.full_name ?? 'Unknown'
          const apptTime = new Date(row.scheduled_at)
          const waitMinutes = Math.max(0, Math.round((Date.now() - apptTime.getTime()) / 60000))
          return {
            id: patientRec?.id ?? row.id,
            name,
            initials: getInitials(name),
            reason: row.reason,
            status: (row.status === 'in-call' ? 'in-call' : 'waiting') as 'waiting' | 'in-call',
            waitMinutes,
            appointmentId: row.id,
          }
        })
      : undefined  // undefined → TelehealthCenter uses its seed fallback

  return (
    <div className="-m-6 h-[calc(100vh-64px)] overflow-hidden">
      <TelehealthCenter initialPatients={waiting} />
    </div>
  )
}
