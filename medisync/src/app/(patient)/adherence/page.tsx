'use client';

import { useEffect, useState } from 'react';
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
} from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { calculatePDC, getPDCRiskLevel } from '@/lib/pdc/calculator';
import type { AdherenceLog, Prescription } from '@/types';

function makeSeedLogs(): AdherenceLog[] {
  const logs: AdherenceLog[] = [];
  const today = new Date();

  const slots = [
    { rxId: 'rx-seed-1', hour: 8, minute: 0, si: 0 },
    { rxId: 'rx-seed-2', hour: 8, minute: 30, si: 1 },
    { rxId: 'rx-seed-2', hour: 18, minute: 30, si: 2 },
    { rxId: 'rx-seed-3', hour: 21, minute: 0, si: 3 },
  ];

  for (let d = 0; d < 30; d++) {
    const date = subDays(today, d);

    for (const { rxId, hour, minute, si } of slots) {
      const scheduled = new Date(date);
      scheduled.setHours(hour, minute, 0, 0);

      const isFuture = scheduled > today;
      const isMissed = !isFuture && (d === 3 || d === 10 || d === 17 || d === 24) && si === 0;
      const isSkipped = !isFuture && (d === 5 || d === 12 || d === 19) && si === 2;

      const status: AdherenceLog['status'] = isFuture
        ? 'pending'
        : isMissed
        ? 'missed'
        : isSkipped
        ? 'skipped'
        : 'taken';

      logs.push({
        id: `seed-adh-${rxId}-${d}-${si}`,
        patient_id: 'seed-patient-1',
        prescription_id: rxId,
        scheduled_time: scheduled.toISOString(),
        actual_time:
          status === 'taken'
            ? new Date(scheduled.getTime() + (si + 1) * 7 * 60_000).toISOString()
            : undefined,
        status,
        created_at: scheduled.toISOString(),
      });
    }
  }

  return logs;
}

const SEED_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-seed-1',
    patient_id: 'seed-patient-1',
    clinician_id: 'doc-seed-1',
    medication_name: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Once daily',
    days_supply: 30,
    refills: 5,
    start_date: '2024-01-15',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rx-seed-2',
    patient_id: 'seed-patient-1',
    clinician_id: 'doc-seed-1',
    medication_name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily',
    days_supply: 30,
    refills: 3,
    start_date: '2024-01-01',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rx-seed-3',
    patient_id: 'seed-patient-1',
    clinician_id: 'doc-seed-1',
    medication_name: 'Atorvastatin',
    dosage: '40mg',
    frequency: 'Once daily',
    days_supply: 30,
    refills: 2,
    start_date: '2024-02-01',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function computeOverallPDC(logs: AdherenceLog[], prescriptions: Prescription[]): number {
  if (!prescriptions.length) return 0;
  const periodStart = subDays(new Date(), 30);
  const periodEnd = new Date();

  const scores = prescriptions.map((rx) => {
    const takenLogs = logs.filter(
      (l) => l.prescription_id === rx.id && l.status === 'taken'
    );
    if (!takenLogs.length) return 0;
    return calculatePDC({
      dispensingDates: takenLogs.map((l) => new Date(l.scheduled_time)),
      daysSupply: takenLogs.map(() => 1),
      periodStart,
      periodEnd,
    });
  });

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function computeRxPDC(logs: AdherenceLog[], rx: Prescription): number {
  const takenLogs = logs.filter(
    (l) => l.prescription_id === rx.id && l.status === 'taken'
  );
  if (!takenLogs.length) return 0;
  return calculatePDC({
    dispensingDates: takenLogs.map((l) => new Date(l.scheduled_time)),
    daysSupply: takenLogs.map(() => 1),
    periodStart: subDays(new Date(), 30),
    periodEnd: new Date(),
  });
}

function computeStreak(logs: AdherenceLog[], rxId: string): number {
  const takenDays = new Set(
    logs
      .filter((l) => l.prescription_id === rxId && l.status === 'taken')
      .map((l) => format(new Date(l.scheduled_time), 'yyyy-MM-dd'))
  );

  let streak = 0;
  let check = new Date();

  while (takenDays.has(format(check, 'yyyy-MM-dd'))) {
    streak++;
    check = subDays(check, 1);
  }

  return streak;
}

function getLastTaken(logs: AdherenceLog[], rxId: string): string | null {
  const taken = logs
    .filter((l) => l.prescription_id === rxId && l.status === 'taken')
    .sort(
      (a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime()
    );
  return taken[0]?.scheduled_time ?? null;
}

function get7DayData(logs: AdherenceLog[]) {
  const today = new Date();
  const days = eachDayOfInterval({ start: subDays(today, 6), end: today });

  return days.map((day) => {
    const start = startOfDay(day);
    const end = endOfDay(day);
    const dayLogs = logs.filter((l) => {
      const t = new Date(l.scheduled_time);
      return t >= start && t <= end;
    });
    return {
      date: format(day, 'MM/dd'),
      taken: dayLogs.filter((l) => l.status === 'taken').length,
      skipped: dayLogs.filter((l) => l.status === 'skipped').length,
      missed: dayLogs.filter((l) => l.status === 'missed' || l.status === 'late').length,
    };
  });
}

function PDCRing({ score }: { score: number }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setAnimated(score), 150);
    return () => clearTimeout(id);
  }, [score]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" aria-label={`PDC score: ${score}%`}>
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="12" />
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.4s ease' }}
      />
      <text
        x="70"
        y="66"
        textAnchor="middle"
        fontSize="24"
        fontWeight="bold"
        fill={color}
        dominantBaseline="middle"
      >
        {score}%
      </text>
      <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#9ca3af">
        PDC
      </text>
    </svg>
  );
}

interface RxCardProps {
  prescription: Prescription;
  score: number;
  streak: number;
  lastTaken: string | null;
}

function PrescriptionCard({ prescription, score, streak, lastTaken }: RxCardProps) {
  const riskLevel = getPDCRiskLevel(score);
  const colorMap: Record<string, string> = {
    LOW: 'text-green-600 bg-green-50 border-green-200',
    MODERATE: 'text-amber-600 bg-amber-50 border-amber-200',
    HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
    CRITICAL: 'text-red-600 bg-red-50 border-red-200',
  };
  const badgeClass = colorMap[riskLevel] ?? colorMap.MODERATE;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-900">{prescription.medication_name}</p>
          <p className="text-xs text-gray-500">
            {prescription.dosage} · {prescription.frequency}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeClass}`}>
          {score}% PDC
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F4F6F8] rounded-lg p-3">
          <p className="text-xs text-gray-500">Current Streak</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">
            {streak}
            <span className="text-xs font-normal text-gray-500 ml-1">
              day{streak !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="bg-[#F4F6F8] rounded-lg p-3">
          <p className="text-xs text-gray-500">Last Taken</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {lastTaken ? format(new Date(lastTaken), 'MMM d') : '—'}
          </p>
          {lastTaken && (
            <p className="text-xs text-gray-400">{format(new Date(lastTaken), 'h:mm a')}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>30-day adherence</span>
          <span>{score}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${score}%`,
              backgroundColor: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdherencePage() {
  const [logs, setLogs] = useState<AdherenceLog[]>(() => makeSeedLogs());
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(SEED_PRESCRIPTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: patientData } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (!patientData) {
        setLoading(false);
        return;
      }

      const thirtyDaysAgo = subDays(new Date(), 30);

      const [{ data: logData }, { data: rxData }] = await Promise.all([
        supabase
          .from('adherence_logs')
          .select('*')
          .eq('patient_id', patientData.id)
          .gte('scheduled_time', thirtyDaysAgo.toISOString()),
        supabase
          .from('prescriptions')
          .select('*')
          .eq('patient_id', patientData.id)
          .eq('status', 'active'),
      ]);

      if (logData && logData.length > 0) setLogs(logData as AdherenceLog[]);
      if (rxData && rxData.length > 0) setPrescriptions(rxData as Prescription[]);

      setLoading(false);
    };

    load();
  }, []);

  const overallPDC = computeOverallPDC(logs, prescriptions);
  const chartData = get7DayData(logs);

  const perRxData = prescriptions.map((rx) => ({
    prescription: rx,
    score: computeRxPDC(logs, rx),
    streak: computeStreak(logs, rx.id),
    lastTaken: getLastTaken(logs, rx.id),
  }));

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-48" />
        <div className="h-52 bg-gray-200 rounded-xl" />
        <div className="h-56 bg-gray-200 rounded-xl" />
        <div className="h-36 bg-gray-200 rounded-xl" />
        <div className="h-36 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-6">
      <h1 className="text-xl font-bold text-gray-900">Adherence History</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3">
        <PDCRing score={overallPDC} />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">Proportion of Days Covered</p>
          <p className="text-xs text-gray-400 mt-0.5">Based on last 30 days</p>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-green-500 inline-block" />
            ≥80% Good
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-400 inline-block" />
            60–79% Fair
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-red-500 inline-block" />
            &lt;60% Poor
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">7-Day Overview</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={chartData}
            barCategoryGap="30%"
            margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
              }}
            />
            <Legend
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            />
            <Bar dataKey="taken" fill="#0D6B5E" name="Taken" radius={[3, 3, 0, 0]} />
            <Bar dataKey="skipped" fill="#f59e0b" name="Skipped" radius={[3, 3, 0, 0]} />
            <Bar dataKey="missed" fill="#ef4444" name="Missed" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 px-1">Medication Breakdown</h2>
        {perRxData.map(({ prescription, score, streak, lastTaken }) => (
          <PrescriptionCard
            key={prescription.id}
            prescription={prescription}
            score={score}
            streak={streak}
            lastTaken={lastTaken}
          />
        ))}
      </div>
    </div>
  );
}
