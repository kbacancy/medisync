import { createClient as createServiceClient } from '@supabase/supabase-js'
import { TelehealthCenter } from '@/components/telehealth/TelehealthCenter'
import type { WaitingPatient, UpcomingSlot } from '@/components/telehealth/TelehealthCenter'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function TelehealthPage() {
  const supabase = getServiceClient()

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const [{ data }, { data: upcomingData }] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        reason,
        status,
        room_url,
        room_name,
        patient:patients!patient_id(
          id,
          profile:profiles!profile_id(full_name)
        )
      `)
      .eq('type', 'telehealth')
      .in('status', ['scheduled', 'in-call'])
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at'),
    supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        reason,
        patient:patients!patient_id(
          profile:profiles!profile_id(full_name)
        )
      `)
      .eq('type', 'telehealth')
      .eq('status', 'scheduled')
      .gt('scheduled_at', now.toISOString())
      .lt('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at')
      .limit(5),
  ])

  type RawAppt = {
    id: string
    scheduled_at: string
    reason: string
    status: string
    room_url: string | null
    room_name: string | null
    patient: {
      id: string
      profile: { full_name: string } | { full_name: string }[] | null
    } | {
      id: string
      profile: { full_name: string } | { full_name: string }[] | null
    }[] | null
  }

  type RawUpcoming = {
    id: string
    scheduled_at: string
    reason: string
    patient: {
      profile: { full_name: string } | { full_name: string }[] | null
    } | {
      profile: { full_name: string } | { full_name: string }[] | null
    }[] | null
  }

  function getInitials(name: string) {
    return name.split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('')
  }

  const seenPatientIds = new Set<string>()
  const waiting: WaitingPatient[] =
    data && data.length > 0
      ? (data as RawAppt[]).reduce<WaitingPatient[]>((acc, row) => {
          const patientRec = Array.isArray(row.patient) ? row.patient[0] : row.patient
          if (!patientRec?.id) return acc
          const patientId = patientRec.id
          if (seenPatientIds.has(patientId)) return acc
          seenPatientIds.add(patientId)
          const profileObj = patientRec?.profile
            ? (Array.isArray(patientRec.profile) ? patientRec.profile[0] : patientRec.profile)
            : null
          const name = profileObj?.full_name ?? 'Unknown'
          const apptTime = new Date(row.scheduled_at)
          const waitMinutes = Math.max(0, Math.round((Date.now() - apptTime.getTime()) / 60000))
          acc.push({
            id: patientId,
            name,
            initials: getInitials(name),
            reason: row.reason,
            status: (row.status === 'in-call' ? 'in-call' : 'waiting') as 'waiting' | 'in-call',
            waitMinutes,
            appointmentId: row.id,
            roomUrl: row.room_url ?? undefined,
            roomName: row.room_name ?? undefined,
          })
          return acc
        }, [])
      : []

  const upcoming: UpcomingSlot[] = (upcomingData as RawUpcoming[] ?? []).map((row) => {
    const patientRec = Array.isArray(row.patient) ? row.patient[0] : row.patient
    const profileObj = patientRec?.profile
      ? (Array.isArray(patientRec.profile) ? patientRec.profile[0] : patientRec.profile)
      : null
    const patientName = profileObj?.full_name ?? 'Unknown Patient'
    const time = new Date(row.scheduled_at).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
    return { id: row.id, time, patientName, reason: row.reason }
  })

  return (
    <div className="-m-6 h-[calc(100vh-64px)] overflow-hidden">
      <TelehealthCenter initialPatients={waiting} initialUpcoming={upcoming} />
    </div>
  )
}
