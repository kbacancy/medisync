import { Suspense } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Users, Pill, AlertTriangle, TrendingUp, Video, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { StatCard } from '@/components/ui/stat-card';
import { RiskBadge } from '@/components/ui/risk-badge';
import { StatSkeleton, CardSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { RiskLevel, PatientWithPDC } from '@/types';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const SEED_STATS = {
  total_patients: 127,
  active_prescriptions: 384,
  critical_alerts: 3,
  avg_pdc_score: 78,
};

const SEED_PATIENTS: PatientWithPDC[] = [
  { id: '1', full_name: 'Maria Santos', risk_level: 'MODERATE', pdc_score: 82, last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: '2', full_name: 'James Wilson', risk_level: 'CRITICAL', pdc_score: 54, last_activity: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { id: '3', full_name: 'Aisha Johnson', risk_level: 'LOW', pdc_score: 91, last_activity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { id: '4', full_name: 'Robert Chen', risk_level: 'HIGH', pdc_score: 61, last_activity: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
  { id: '5', full_name: 'Lisa Park', risk_level: 'MODERATE', pdc_score: 75, last_activity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
];

interface SeedAppointment {
  id: string;
  patient_name: string;
  time: string;
  type: 'telehealth' | 'in_person';
  reason: string;
}

const SEED_APPOINTMENTS: SeedAppointment[] = [
  { id: '1', patient_name: 'Maria Santos', time: '09:00', type: 'telehealth', reason: 'Medication review' },
  { id: '2', patient_name: 'James Wilson', time: '10:30', type: 'in_person', reason: 'Follow-up consultation' },
  { id: '3', patient_name: 'Emma Davis', time: '14:00', type: 'telehealth', reason: 'Blood pressure check' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

function getPDCBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 65) return 'bg-amber-400';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

// ─── Async Server Components ─────────────────────────────────────────────────

function calcTrend(
  curr: number | null,
  prev: number | null,
): { direction: 'up' | 'down'; percentage: number } | undefined {
  if (curr == null || prev == null || prev === 0) return undefined;
  const pct = Math.round((Math.abs(curr - prev) / prev) * 100);
  return { direction: curr >= prev ? 'up' : 'down', percentage: pct };
}

function avgScores(rows: { score: number }[] | null): number | null {
  if (!rows || rows.length === 0) return null;
  return Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length);
}

async function StatsSection() {
  let stats = SEED_STATS;
  let trends: {
    patients?: { direction: 'up' | 'down'; percentage: number };
    prescriptions?: { direction: 'up' | 'down'; percentage: number };
    critical?: { direction: 'up' | 'down'; percentage: number };
    pdc?: { direction: 'up' | 'down'; percentage: number };
  } = {};

  try {
    const supabase = await createClient();

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

    const [
      { count: totalPatients },
      { count: activePrescriptions },
      { count: criticalCount },
      { data: pdcAll },
      { count: newPatientsThis },
      { count: newPatientsLast },
      { count: newRxThis },
      { count: newRxLast },
      { count: criticalLast },
      { data: pdcThis },
      { data: pdcLast },
    ] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact', head: true }),
      supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('patients').select('*', { count: 'exact', head: true }).eq('risk_level', 'CRITICAL'),
      supabase.from('pdc_scores').select('score'),
      supabase.from('patients').select('*', { count: 'exact', head: true }).gte('created_at', thisMonthStart),
      supabase.from('patients').select('*', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
      supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', thisMonthStart),
      supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
      supabase.from('patients').select('*', { count: 'exact', head: true }).eq('risk_level', 'CRITICAL').lte('updated_at', lastMonthEnd),
      supabase.from('pdc_scores').select('score').gte('calculated_at', thisMonthStart),
      supabase.from('pdc_scores').select('score').gte('calculated_at', lastMonthStart).lte('calculated_at', lastMonthEnd),
    ]);

    const avgPDC = avgScores(pdcAll) ?? SEED_STATS.avg_pdc_score;

    if (totalPatients !== null) {
      stats = {
        total_patients: totalPatients,
        active_prescriptions: activePrescriptions ?? SEED_STATS.active_prescriptions,
        critical_alerts: criticalCount ?? SEED_STATS.critical_alerts,
        avg_pdc_score: avgPDC,
      };
      trends = {
        patients:      calcTrend(newPatientsThis, newPatientsLast),
        prescriptions: calcTrend(newRxThis,       newRxLast),
        critical:      calcTrend(criticalLast,     criticalCount),  // inverted: fewer critical = up (good)
        pdc:           calcTrend(avgScores(pdcThis), avgScores(pdcLast)),
      };
    }
  } catch {
    // fall back to seed
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title="Total Patients"
        value={stats.total_patients}
        icon={Users}
        iconBg="bg-[#0D6B5E]"
        trend={trends.patients}
      />
      <StatCard
        title="Active Prescriptions"
        value={stats.active_prescriptions}
        icon={Pill}
        iconBg="bg-blue-500"
        trend={trends.prescriptions}
      />
      <StatCard
        title="Critical Alerts"
        value={stats.critical_alerts}
        icon={AlertTriangle}
        iconBg="bg-red-500"
        trend={trends.critical}
      />
      <StatCard
        title="Avg PDC Score"
        value={`${stats.avg_pdc_score}%`}
        icon={TrendingUp}
        iconBg="bg-emerald-500"
        trend={trends.pdc}
      />
    </div>
  );
}

async function RecentPatientsSection() {
  let patients: PatientWithPDC[] = SEED_PATIENTS;

  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('patients')
      .select(`
        id,
        risk_level,
        updated_at,
        profile:profiles!profile_id(full_name),
        pdc_scores(score)
      `)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      patients = data.map((row: {
        id: string;
        risk_level: RiskLevel;
        updated_at: string;
        profile: { full_name: string } | { full_name: string }[] | null;
        pdc_scores: { score: number }[] | null;
      }) => {
        const profileObj = Array.isArray(row.profile) ? row.profile[0] : row.profile;
        const scores = row.pdc_scores ?? [];
        const avgScore =
          scores.length > 0
            ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
            : 0;
        return {
          id: row.id,
          full_name: profileObj?.full_name ?? 'Unknown',
          risk_level: row.risk_level as RiskLevel,
          pdc_score: avgScore,
          last_activity: row.updated_at,
        };
      });
    }
  } catch {
    // fall back to seed
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Recent Patients</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PDC %</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Activity</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {patients.map((patient) => (
              <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-[#0D6B5E]/10 flex items-center justify-center shrink-0">
                      <span className="text-[#0D6B5E] text-xs font-semibold">
                        {getInitials(patient.full_name)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{patient.full_name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <RiskBadge risk={patient.risk_level} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getPDCBarColor(patient.pdc_score)}`}
                        style={{ width: `${patient.pdc_score}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{patient.pdc_score}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-500 text-xs">
                  {formatDistanceToNow(new Date(patient.last_activity), { addSuffix: true })}
                </td>
                <td className="px-5 py-4">
                  <Link href={`/patients/${patient.id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function TodayAppointmentsSection() {
  let appointments: SeedAppointment[] = SEED_APPOINTMENTS;
  let usingSeed = true;

  try {
    const supabase = getServiceClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        type,
        reason,
        patient:patients!patient_id(profile:profiles!profile_id(full_name))
      `)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at', { ascending: true });

    if (data && data.length > 0) {
      usingSeed = false;
      appointments = data.map((row: {
        id: string;
        scheduled_at: string;
        type: 'telehealth' | 'in_person';
        reason: string;
        patient: { profile: { full_name: string } | { full_name: string }[] | null } | { profile: { full_name: string } | { full_name: string }[] | null }[] | null;
      }) => {
        const patientRec = Array.isArray(row.patient) ? row.patient[0] : row.patient;
        const profileObj = patientRec?.profile
          ? (Array.isArray(patientRec.profile) ? patientRec.profile[0] : patientRec.profile)
          : null;
        const d = new Date(row.scheduled_at);
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        return {
          id: row.id,
          patient_name: profileObj?.full_name ?? 'Unknown',
          time: `${hh}:${mm}`,
          type: row.type,
          reason: row.reason,
        };
      });
    }
  } catch {
    // fall back to seed
  }

  void usingSeed;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Today&apos;s Appointments</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {appointments.map((appt) => (
          <div key={appt.id} className="flex items-center gap-4 px-5 py-4">
            <div className="text-center shrink-0 w-12">
              <p className="text-sm font-bold text-gray-900">{appt.time}</p>
            </div>
            <div className="w-px h-8 bg-gray-200 shrink-0" />
            <div className="size-8 rounded-full bg-[#0D6B5E]/10 flex items-center justify-center shrink-0">
              <span className="text-[#0D6B5E] text-xs font-semibold">
                {getInitials(appt.patient_name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{appt.patient_name}</p>
              <p className="text-xs text-gray-500 truncate">{appt.reason}</p>
            </div>
            <Badge
              variant="outline"
              className={
                appt.type === 'telehealth'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }
            >
              {appt.type === 'telehealth' ? (
                <span className="flex items-center gap-1"><Video className="size-3" /> Video</span>
              ) : (
                <span className="flex items-center gap-1"><MapPin className="size-3" /> In-person</span>
              )}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null };
  const TITLES = new Set(['Dr.', 'Dr', 'Mr.', 'Mrs.', 'Ms.', 'Miss', 'Prof.', 'MD', 'PhD']);
  const nameParts = (profile?.full_name ?? '').split(' ').filter(Boolean);
  const firstName = nameParts.find((p: string) => !TITLES.has(p)) ?? nameParts[0] ?? 'Doctor';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Good morning, Dr. {firstName}</h2>
        <p className="text-gray-500 mt-1 text-sm">Here&apos;s an overview of your patients today.</p>
      </div>

      {/* Stats */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
        }
      >
        <StatsSection />
      </Suspense>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients — col-span-2 */}
        <div className="lg:col-span-2">
          <Suspense fallback={<TableSkeleton rows={5} />}>
            <RecentPatientsSection />
          </Suspense>
        </div>

        {/* Today's Appointments */}
        <div className="lg:col-span-1">
          <Suspense fallback={<CardSkeleton />}>
            <TodayAppointmentsSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
