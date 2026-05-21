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

const SEED_PATIENTS: PatientTableRow[] = [
  { id: '1', full_name: 'Maria Santos',  active_med_count: 3, pdc_score: 82, inventory_days: 18, risk_level: 'MODERATE' },
  { id: '2', full_name: 'James Wilson',  active_med_count: 5, pdc_score: 54, inventory_days: 3,  risk_level: 'CRITICAL' },
  { id: '3', full_name: 'Aisha Johnson', active_med_count: 2, pdc_score: 91, inventory_days: 22, risk_level: 'LOW'      },
  { id: '4', full_name: 'Robert Chen',   active_med_count: 4, pdc_score: 61, inventory_days: 5,  risk_level: 'HIGH'     },
  { id: '5', full_name: 'Lisa Park',     active_med_count: 3, pdc_score: 75, inventory_days: 12, risk_level: 'MODERATE' },
  { id: '6', full_name: 'David Okafor',  active_med_count: 1, pdc_score: 88, inventory_days: 26, risk_level: 'LOW'      },
  { id: '7', full_name: 'Emma Davis',    active_med_count: 4, pdc_score: 58, inventory_days: 0,  risk_level: 'HIGH'     },
  { id: '8', full_name: 'Carlos Rivera', active_med_count: 2, pdc_score: 77, inventory_days: 14, risk_level: 'MODERATE' },
]

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

  const rows: PatientTableRow[] =
    data && data.length > 0
      ? (data as RawRow[]).map((p) => {
          const activeRx = (p.rx ?? []).filter((r) => r.status === 'active')
          const latestDispense = [...(p.dispense ?? [])].sort(
            (a, b) =>
              new Date(b.dispensed_at).getTime() - new Date(a.dispensed_at).getTime()
          )[0]
          const profileObj = Array.isArray(p.profile) ? p.profile[0] : p.profile
          return {
            id: p.id,
            full_name: profileObj?.full_name || 'Unknown',
            active_med_count: activeRx.length,
            pdc_score: p.pdc?.[0]?.score ?? 0,
            inventory_days: latestDispense?.remaining_count ?? 20,
            risk_level: p.risk_level,
          }
        })
      : SEED_PATIENTS

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
