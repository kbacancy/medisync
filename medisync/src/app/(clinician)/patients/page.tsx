import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { TableSkeleton } from '@/components/ui/loading-skeleton'
import { PatientsTable } from '@/components/adherence/PatientsTable'
import { AddPatientButton } from '@/components/adherence/AddPatientButton'
import type { PatientTableRow } from '@/components/adherence/PatientsTable'
import type { RiskLevel } from '@/types'

export const dynamic = 'force-dynamic'

// Service role bypasses RLS entirely — safe here because the layout already
// validates the session and confirms the user has role = 'clinician'.
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function PatientsData() {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('patients')
    .select(`
      id,
      risk_level,
      profile:profiles!profile_id(full_name),
      pdc:pdc_scores(score),
      rx:prescriptions(id, status),
      dispense:dispense_records(remaining_count, dispensed_at)
    `)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) console.error('[PatientsData] query error:', error.message)

  type RawRow = {
    id: string
    risk_level: RiskLevel
    profile: { full_name: string } | { full_name: string }[] | null
    pdc: { score: number }[]
    rx: { id: string; status: string }[]
    dispense: { remaining_count: number; dispensed_at: string }[]
  }

  const rows: PatientTableRow[] = (data ?? []).map((p) => {
    const row = p as RawRow
    const activeRx = (row.rx ?? []).filter((r) => r.status === 'active')
    const latestDispense = [...(row.dispense ?? [])].sort(
      (a, b) =>
        new Date(b.dispensed_at).getTime() - new Date(a.dispensed_at).getTime()
    )[0]
    const profileObj = Array.isArray(row.profile) ? row.profile[0] : row.profile
    return {
      id: row.id,
      full_name: profileObj?.full_name || 'Unknown',
      active_med_count: activeRx.length,
      pdc_score: row.pdc?.[0]?.score ?? 0,
      inventory_days: latestDispense?.remaining_count ?? 20,
      risk_level: row.risk_level,
    }
  })

  return <PatientsTable patients={rows} />
}

export default function PatientsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-0.5">Adherence monitoring dashboard</p>
        </div>
        <AddPatientButton />
      </div>

      <Suspense fallback={<TableSkeleton rows={8} />}>
        <PatientsData />
      </Suspense>
    </div>
  )
}
