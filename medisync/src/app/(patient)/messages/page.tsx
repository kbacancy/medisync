import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PatientMessageThread } from '@/components/patient/PatientMessageThread'
import { MessageCircle } from 'lucide-react'

export default async function MessagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: patientRecord } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!patientRecord) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400 gap-3">
        <MessageCircle className="size-10 opacity-30" />
        <p className="text-sm">No message thread available yet.</p>
        <p className="text-xs text-center px-8 text-gray-400">
          Your care team will contact you here once your account is set up.
        </p>
      </div>
    )
  }

  return (
    <PatientMessageThread
      patientId={patientRecord.id}
      userId={user.id}
    />
  )
}
