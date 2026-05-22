import { Suspense } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { Users, Pill, AlertTriangle, TrendingUp, Video, MapPin, Calendar, ArrowRight } from 'lucide-react';
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
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

function pdcBarColor(score: number): string {
  if (score >= 80) return 'var(--ms-ok)';
  if (score >= 65) return 'var(--ms-warn)';
  if (score >= 50) return '#F97316';
  return 'var(--ms-critical)';
}

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

// ─── Stats Section ────────────────────────────────────────────────────────────

async function StatsSection() {
  const supabase = getServiceClient();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

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

  const avgPDC = avgScores(pdcAll) ?? 0;
  const trends = {
    patients: calcTrend(newPatientsThis, newPatientsLast),
    prescriptions: calcTrend(newRxThis, newRxLast),
    critical: calcTrend(criticalLast, criticalCount),
    pdc: calcTrend(avgScores(pdcThis), avgScores(pdcLast)),
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard title="Total Patients" value={totalPatients ?? 0} icon={Users} accentColor="#0A7B5C" trend={trends.patients} />
      <StatCard title="Active Prescriptions" value={activePrescriptions ?? 0} icon={Pill} accentColor="#3B82F6" trend={trends.prescriptions} />
      <StatCard title="Critical Alerts" value={criticalCount ?? 0} icon={AlertTriangle} accentColor="#DC2626" trend={trends.critical} />
      <StatCard title="Avg PDC Score" value={`${avgPDC}%`} icon={TrendingUp} accentColor="#16A34A" trend={trends.pdc} />
    </div>
  );
}

// ─── Recent Patients Section ──────────────────────────────────────────────────

async function RecentPatientsSection() {
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

  const patients: PatientWithPDC[] = (data ?? []).map((row: {
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

  return (
    <div
      className="bg-white rounded-xl overflow-hidden"
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
    >
      {/* Section header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--ms-border)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--ms-text-primary)' }}>
          Recent Patients
        </h2>
        <Link
          href="/patients"
          className="flex items-center gap-1 text-sm font-medium transition-colors duration-150"
          style={{ color: 'var(--ms-primary)' }}
        >
          View all
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {patients.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12"
          style={{ color: 'var(--ms-text-tertiary)' }}
        >
          <Users className="size-8 mb-3 opacity-40" />
          <p className="text-sm font-medium" style={{ color: 'var(--ms-text-secondary)' }}>
            No patients yet
          </p>
          <Link href="/patients" className="mt-3">
            <Button size="sm" variant="outline" className="text-xs">
              Add First Patient
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--ms-surface-raised)' }}>
                {['Patient', 'Risk', 'PDC %', 'Last Activity', ''].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--ms-text-tertiary)' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="group transition-colors duration-100 hover:bg-[#F9FAFB]"
                  style={{ borderTop: '0.5px solid var(--ms-border)' }}
                >
                  {/* Patient avatar + name */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="size-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold select-none"
                        style={{
                          backgroundColor: 'var(--ms-primary-light)',
                          color: 'var(--ms-primary)',
                        }}
                      >
                        {getInitials(patient.full_name)}
                      </div>
                      <span className="font-medium" style={{ color: 'var(--ms-text-primary)' }}>
                        {patient.full_name}
                      </span>
                    </div>
                  </td>

                  {/* Risk badge */}
                  <td className="px-5 py-4">
                    <RiskBadge risk={patient.risk_level} />
                  </td>

                  {/* PDC bar */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="rounded-full overflow-hidden"
                        style={{
                          width: 160,
                          height: 6,
                          backgroundColor: 'var(--ms-border)',
                        }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${patient.pdc_score}%`,
                            backgroundColor: pdcBarColor(patient.pdc_score),
                          }}
                        />
                      </div>
                      <span
                        className="text-xs font-medium tabular-nums"
                        style={{ color: 'var(--ms-text-secondary)' }}
                      >
                        {patient.pdc_score}%
                      </span>
                    </div>
                  </td>

                  {/* Last activity */}
                  <td className="px-5 py-4 text-xs" style={{ color: 'var(--ms-text-secondary)' }}>
                    {formatDistanceToNow(new Date(patient.last_activity), { addSuffix: true })}
                  </td>

                  {/* Action — ghost button visible on hover */}
                  <td className="px-5 py-4">
                    <Link href={`/patients/${patient.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                      >
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Today's Appointments Section ─────────────────────────────────────────────

async function TodayAppointmentsSection() {
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

  const appointments = (data ?? []).map((row: {
    id: string;
    scheduled_at: string;
    type: 'telehealth' | 'in_person';
    reason: string;
    patient: { profile: { full_name: string } | { full_name: string }[] | null } | { profile: { full_name: string } | { full_name: string }[] | null }[] | null;
  }) => {
    const patientRec = Array.isArray(row.patient) ? row.patient[0] : row.patient;
    const profileObj = patientRec?.profile
      ? Array.isArray(patientRec.profile) ? patientRec.profile[0] : patientRec.profile
      : null;
    const d = new Date(row.scheduled_at);
    return {
      id: row.id,
      patient_name: profileObj?.full_name ?? 'Unknown',
      time: format(d, 'HH:mm'),
      type: row.type,
      reason: row.reason,
    };
  });

  return (
    <div
      className="bg-white rounded-xl overflow-hidden"
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
    >
      <div
        className="px-5 py-4"
        style={{ borderBottom: '1px solid var(--ms-border)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--ms-text-primary)' }}>
          Today&apos;s Appointments
        </h2>
      </div>

      {appointments.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12"
          style={{ color: 'var(--ms-text-tertiary)' }}
        >
          <Calendar className="size-8 mb-3 opacity-40" />
          <p className="text-sm" style={{ color: 'var(--ms-text-secondary)' }}>
            No appointments today
          </p>
        </div>
      ) : (
        <div>
          {appointments.map((appt, i) => (
            <div
              key={appt.id}
              className="flex items-center gap-4 px-5 py-4"
              style={i > 0 ? { borderTop: '0.5px solid var(--ms-border)' } : undefined}
            >
              {/* Time — monospace */}
              <p
                className="text-sm font-medium tabular-nums shrink-0 w-12 text-center"
                style={{
                  color: 'var(--ms-text-secondary)',
                  fontFamily: 'var(--font-mono), monospace',
                }}
              >
                {appt.time}
              </p>

              {/* Patient avatar */}
              <div
                className="size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold select-none"
                style={{
                  backgroundColor: 'var(--ms-primary-light)',
                  color: 'var(--ms-primary)',
                }}
              >
                {getInitials(appt.patient_name)}
              </div>

              {/* Name + reason */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--ms-text-primary)' }}>
                  {appt.patient_name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--ms-text-secondary)' }}>
                  {appt.reason}
                </p>
              </div>

              {/* Type badge */}
              {appt.type === 'telehealth' ? (
                <button
                  className="size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 hover:bg-[#C6EBE0]"
                  style={{ backgroundColor: 'var(--ms-primary-light)' }}
                  title="Video call"
                >
                  <Video className="size-3.5" style={{ color: 'var(--ms-primary)' }} />
                </button>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs shrink-0"
                  style={{
                    backgroundColor: 'var(--ms-surface-raised)',
                    color: 'var(--ms-text-secondary)',
                    border: '1px solid var(--ms-border)',
                  }}
                >
                  <MapPin className="size-3 mr-1" />
                  In-person
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profileData } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null };

  const rawName = profileData?.full_name ?? user?.email?.split('@')[0] ?? '';
  const TITLES = new Set(['Dr.', 'Dr', 'Mr.', 'Mrs.', 'Ms.', 'Miss', 'Prof.', 'MD', 'PhD']);
  const nameParts = rawName.split(' ').filter(Boolean);
  const hasTitle = nameParts.length > 0 && TITLES.has(nameParts[0]);
  const firstName = nameParts.find((p: string) => !TITLES.has(p)) ?? nameParts[0] ?? 'there';
  const greeting =
    hasTitle || nameParts.length > 1
      ? `Good morning, Dr. ${firstName}`
      : `Good morning, ${firstName}`;

  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="space-y-6">
      {/* Greeting hero */}
      <div>
        <h2
          className="font-medium"
          style={{
            fontSize: 22,
            color: 'var(--ms-text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {greeting}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ms-text-secondary)' }}>
          {today} — here&apos;s an overview of your patients.
        </p>
      </div>

      {/* Stats grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
        }
      >
        <StatsSection />
      </Suspense>

      {/* Main content — 2/3 table + 1/3 appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<TableSkeleton rows={5} />}>
            <RecentPatientsSection />
          </Suspense>
        </div>
        <div className="lg:col-span-1">
          <Suspense fallback={<CardSkeleton />}>
            <TodayAppointmentsSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
