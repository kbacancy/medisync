import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PatientCallView } from '@/components/patient/PatientCallView'

interface CallPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CallPage({ searchParams }: CallPageProps) {
  const params = await searchParams
  const roomUrl = typeof params.roomUrl === 'string' ? params.roomUrl : undefined
  const roomName = typeof params.roomName === 'string' ? params.roomName : undefined
  const appointmentId =
    typeof params.appointmentId === 'string' ? params.appointmentId : undefined

  if (!roomUrl || !roomName || !appointmentId) {
    redirect('/medications')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Patient'

  return (
    <PatientCallView
      appointmentId={appointmentId}
      roomUrl={decodeURIComponent(roomUrl)}
      roomName={roomName}
      userId={user.id}
      userName={userName}
    />
  )
}
