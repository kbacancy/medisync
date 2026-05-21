import { createClient } from '@/lib/supabase/server'
import { TelehealthCenter } from '@/components/telehealth/TelehealthCenter'

export default async function TelehealthPage() {
  const supabase = await createClient()

  // Fetch today's telehealth appointments joined with patient profiles
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setDate(todayEnd.getDate() + 1)

  await supabase
    .from('appointments')
    .select('id, scheduled_at, reason, status, type, patient:profiles!patient_id(id, full_name)')
    .eq('type', 'telehealth')
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at')

  // TelehealthCenter uses its own comprehensive seed data when Supabase
  // tables are empty, so no data-plumbing needed for the prototype phase.
  return (
    <div className="-m-6 h-[calc(100vh-64px)] overflow-hidden">
      <TelehealthCenter />
    </div>
  )
}
