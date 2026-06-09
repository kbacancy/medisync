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

const TEAL_SHADES = [
  { bg: '#E8F5F1', fg: '#1A7A5E' },
  { bg: '#D0EDE5', fg: '#155F4A' },
  { bg: '#BAE4DA', fg: '#0E5241' },
  { bg: '#C8EDE3', fg: '#14694F' },
  { bg: '#D8F0E8', fg: '#1A7A5E' },
  { bg: '#E2F4EE', fg: '#177A5C' },
];

function avatarShade(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TEAL_SHADES[Math.abs(h) % TEAL_SHADES.length];
}

function AvatarCircle({ name }: { name: string }) {
  const shade = avatarShade(name);
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: shade.bg,
        color: shade.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 14,
        fontWeight: 500,
        userSelect: 'none',
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function pdcBarColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
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
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      {/* Section header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--ms-text-primary)', letterSpacing: '-0.1px' }}>
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
              <tr>
                {['Patient', 'Risk', 'PDC Score', 'Last Activity', ''].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-3 text-left"
                    style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ms-text-tertiary)' }}
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
                  className="group ms-row-hover transition-colors duration-100"
                  style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}
                >
                  {/* Patient avatar + name */}
                  <td className="px-5" style={{ height: 56 }}>
                    <div className="flex items-center gap-3">
                      <AvatarCircle name={patient.full_name} />
                      <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ms-text-primary)' }}>
                        {patient.full_name}
                      </span>
                    </div>
                  </td>

                  {/* Risk badge */}
                  <td className="px-5 py-4">
                    <RiskBadge risk={patient.risk_level} />
                  </td>

                  {/* PDC bar */}
                  <td className="px-5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="rounded-full overflow-hidden shrink-0"
                        style={{ width: 200, height: 6, backgroundColor: 'rgba(0,0,0,0.08)' }}
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
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: pdcBarColor(patient.pdc_score),
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {patient.pdc_score}%
                      </span>
                    </div>
                  </td>

                  {/* Last activity */}
                  <td className="px-5" style={{ fontSize: 13, color: 'var(--ms-text-tertiary)' }}>
                    {formatDistanceToNow(new Date(patient.last_activity), { addSuffix: true })}
                  </td>

                  {/* Action */}
                  <td className="px-5">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="ms-ghost-link opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                    >
                      View
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
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      <div
        className="px-5 py-4"
        style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--ms-text-primary)', letterSpacing: '-0.1px' }}>
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
              className="flex items-center gap-3 px-5 py-3"
              style={i > 0 ? { borderTop: '0.5px solid rgba(0,0,0,0.06)' } : undefined}
            >
              {/* Time — monospace */}
              <p
                className="shrink-0 w-12 text-right tabular-nums"
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: 'var(--ms-text-tertiary)',
                  fontFamily: 'var(--font-mono), monospace',
                }}
              >
                {appt.time}
              </p>

              {/* Patient avatar */}
              <AvatarCircle name={appt.patient_name} />

              {/* Name + reason */}
              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ms-text-primary)' }}>
                  {appt.patient_name}
                </p>
                <p className="truncate" style={{ fontSize: 13, color: 'var(--ms-text-secondary)' }}>
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
        {/* Section label — mirrors BacancyLabIQ "OPERATIONAL SURFACE" pattern */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ms-primary)',
            marginBottom: 8,
          }}
        >
          Clinical Surface
        </p>
        <h2
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: 'var(--ms-text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          {greeting}
        </h2>
        <p style={{ marginTop: 6, fontSize: 15, color: 'var(--ms-text-secondary)', lineHeight: 1.6 }}>
          {today} — here&apos;s an overview of your patients.
        </p>
      </div>

      {/* Smart Insight banner */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3.5"
        style={{
          backgroundColor: 'rgba(26,122,94,0.07)',
          border: '1px solid rgba(26,122,94,0.15)',
        }}
      >
        <span className="flex items-center gap-2 shrink-0 mt-0.5">
          <span
            className="inline-block rounded-full ms-live-dot"
            style={{ width: 8, height: 8, backgroundColor: 'var(--ms-primary)' }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ms-primary)',
            }}
          >
            Smart Insight · Live
          </span>
        </span>
        <p style={{ fontSize: 14, color: 'var(--ms-text-secondary)', lineHeight: 1.5 }}>
          Review patients with PDC scores below 60% — early intervention now can prevent hospitalisation within 30 days.
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
