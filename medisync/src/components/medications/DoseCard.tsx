'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkipReasonModal } from './SkipReasonModal';
import { SnoozeModal } from './SnoozeModal';
import { InventoryBar } from './InventoryBar';
import { queueAction } from '@/lib/offline/syncQueue';
import type { PrescriptionWithDispense, AdherenceLog } from '@/types';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  cardiovascular:    { bg: 'rgba(220,38,38,0.08)',    text: '#DC2626' },
  diabetes:          { bg: 'rgba(59,130,246,0.08)',   text: '#2563EB' },
  antihypertensive:  { bg: 'rgba(124,58,237,0.08)',   text: '#7C3AED' },
  antibiotic:        { bg: 'rgba(234,88,12,0.08)',    text: '#EA580C' },
  thyroid:           { bg: 'rgba(219,39,119,0.08)',   text: '#DB2777' },
  respiratory:       { bg: 'rgba(14,165,233,0.08)',   text: '#0EA5E9' },
  default:           { bg: 'rgba(26,122,94,0.08)',    text: '#1A7A5E' },
};

function getDosesPerDay(frequency: string): number {
  const f = frequency.toLowerCase();
  if (f.includes('twice') || f.includes('bid') || f.includes('2x')) return 2;
  if (f.includes('three') || f.includes('tid') || f.includes('3x')) return 3;
  if (f.includes('four') || f.includes('qid') || f.includes('4x')) return 4;
  return 1;
}

interface StatusBadgeProps {
  log: AdherenceLog;
  actualTime: string | null;
  snoozeTime: string | null;
}

function StatusBadge({ log, actualTime, snoozeTime }: StatusBadgeProps) {
  switch (log.status) {
    case 'taken':
      return (
        <div className="text-right shrink-0">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--ms-ok)' }}
          >
            <CheckCircle className="size-3" />
            Taken ✓
          </span>
          {actualTime && (
            <p className="text-[10px] mt-0.5 text-right" style={{ color: 'var(--ms-text-tertiary)' }}>
              at {actualTime}
            </p>
          )}
        </div>
      );
    case 'skipped':
      return (
        <div className="text-right shrink-0">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--ms-critical)' }}
          >
            <XCircle className="size-3" />
            Skipped
          </span>
          {log.skip_reason && (
            <p
              className="text-[10px] mt-0.5 text-right max-w-[100px] break-words"
              style={{ color: 'var(--ms-critical)' }}
            >
              {log.skip_reason}
            </p>
          )}
        </div>
      );
    case 'snoozed':
      return (
        <div className="text-right shrink-0">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(217,119,6,0.1)', color: 'var(--ms-warn)' }}
          >
            <Clock className="size-3" />
            Snoozed
          </span>
          {snoozeTime && (
            <p className="text-[10px] mt-0.5 text-right" style={{ color: 'var(--ms-warn)' }}>
              Remind at {snoozeTime}
            </p>
          )}
        </div>
      );
    case 'missed':
      return (
        <span
          className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full shrink-0"
          style={{
            border: '1px solid rgba(220,38,38,0.3)',
            backgroundColor: 'rgba(220,38,38,0.06)',
            color: 'var(--ms-critical)',
          }}
        >
          Missed
        </span>
      );
    default:
      return null;
  }
}

interface Props {
  prescription: PrescriptionWithDispense;
  adherenceLog: AdherenceLog;
  onStatusChange: (
    logId: string,
    status: AdherenceLog['status'],
    reason?: string,
    snoozeUntil?: string
  ) => Promise<void>;
}

export function DoseCard({ prescription, adherenceLog, onStatusChange }: Props) {
  const [skipOpen, setSkipOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  async function handleStatusChange(
    logId: string,
    status: AdherenceLog['status'],
    reason?: string,
    snoozeUntil?: string
  ) {
    if (!navigator.onLine) {
      const actionType =
        status === 'taken' ? 'log-dose' : status === 'skipped' ? 'skip-dose' : 'snooze-dose';
      queueAction({
        type: actionType,
        payload: {
          logId,
          patientId: adherenceLog.patient_id,
          prescriptionId: adherenceLog.prescription_id,
          status,
          actualTime: status === 'taken' ? new Date().toISOString() : undefined,
          skipReason: reason,
          snoozeUntil,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    await onStatusChange(logId, status, reason, snoozeUntil);
  }

  const categoryKey = prescription.medication_category ?? 'default';
  const iconStyle = CATEGORY_COLORS[categoryKey] ?? CATEGORY_COLORS.default;

  const scheduledTime = format(new Date(adherenceLog.scheduled_time), 'h:mm a');
  const actualTime = adherenceLog.actual_time
    ? format(new Date(adherenceLog.actual_time), 'h:mm a')
    : null;
  const snoozeTime = adherenceLog.snooze_until
    ? format(new Date(adherenceLog.snooze_until), 'h:mm a')
    : null;

  const latestDispense = prescription.dispense_records
    ?.slice()
    .sort((a, b) => new Date(b.dispensed_at).getTime() - new Date(a.dispensed_at).getTime())[0];

  const daysRemaining = latestDispense
    ? Math.floor((latestDispense.remaining_count ?? 0) / getDosesPerDay(prescription.frequency))
    : 0;

  const statusBorderColor = {
    pending:  'var(--ms-primary)',
    taken:    'var(--ms-ok)',
    skipped:  'var(--ms-critical)',
    snoozed:  'var(--ms-warn)',
    missed:   'var(--ms-critical)',
    late:     'var(--ms-warn)',
  }[adherenceLog.status] ?? 'var(--ms-primary)';

  const statusBg = {
    taken:   'rgba(16,185,129,0.03)',
    skipped: 'rgba(220,38,38,0.03)',
    snoozed: 'rgba(217,119,6,0.04)',
    missed:  'rgba(220,38,38,0.03)',
  }[adherenceLog.status as string] ?? 'var(--ms-surface)';

  return (
    <>
      <div
        className={cn('rounded-xl p-4 flex gap-3')}
        style={{
          backgroundColor: statusBg,
          boxShadow: 'var(--ms-shadow-sm)',
          border: '1px solid var(--ms-border)',
          borderLeft: `4px solid ${statusBorderColor}`,
          opacity: adherenceLog.status === 'skipped' || adherenceLog.status === 'missed' ? 0.72 : 1,
        }}
      >
        <div
          className="size-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: iconStyle.bg, color: iconStyle.text }}
        >
          <Pill className="size-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className="font-bold leading-tight truncate"
                style={{ fontSize: 16, color: 'var(--ms-text-primary)' }}
              >
                {prescription.medication_name}
              </p>
              <p style={{ fontSize: 13, color: 'var(--ms-text-secondary)' }}>
                {prescription.dosage} · {prescription.form ?? 'Tablet'}
              </p>
            </div>
            <StatusBadge log={adherenceLog} actualTime={actualTime} snoozeTime={snoozeTime} />
          </div>

          {prescription.instructions && (
            <p className="leading-relaxed" style={{ fontSize: 12, color: 'var(--ms-text-tertiary)' }}>
              {prescription.instructions}
            </p>
          )}

          <p style={{ fontSize: 12, color: 'var(--ms-text-tertiary)' }}>Scheduled {scheduledTime}</p>

          {latestDispense && (
            <InventoryBar
              drugName={prescription.medication_name}
              remaining={latestDispense.remaining_count ?? 0}
              totalSupply={latestDispense.quantity_dispensed}
              daysRemaining={daysRemaining}
              patientId={prescription.patient_id}
              prescriptionId={prescription.id}
            />
          )}

          {adherenceLog.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleStatusChange(adherenceLog.id, 'taken')}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] text-white text-sm font-semibold rounded-xl active:scale-95 transition-transform"
                style={{ backgroundColor: 'var(--ms-primary)' }}
              >
                <CheckCircle className="size-4" />
                Take
              </button>
              <button
                type="button"
                onClick={() => setSkipOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] text-sm font-medium rounded-xl active:scale-95 transition-transform"
                style={{
                  border: '1px solid var(--ms-border-strong)',
                  color: 'var(--ms-text-secondary)',
                  backgroundColor: 'var(--ms-surface)',
                }}
              >
                <XCircle className="size-4" />
                Skip
              </button>
              <button
                type="button"
                onClick={() => setSnoozeOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] text-sm font-medium rounded-xl active:scale-95 transition-transform"
                style={{
                  border: '1px solid var(--ms-border-strong)',
                  color: 'var(--ms-text-secondary)',
                  backgroundColor: 'var(--ms-surface)',
                }}
              >
                <Clock className="size-4" />
                Snooze
              </button>
            </div>
          )}
        </div>
      </div>

      <SkipReasonModal
        open={skipOpen}
        onClose={() => setSkipOpen(false)}
        onConfirm={async (reason) => {
          setSkipOpen(false);
          await handleStatusChange(adherenceLog.id, 'skipped', reason);
        }}
      />
      <SnoozeModal
        open={snoozeOpen}
        onClose={() => setSnoozeOpen(false)}
        onConfirm={async (minutes) => {
          setSnoozeOpen(false);
          const snoozeUntil = new Date(Date.now() + minutes * 60_000).toISOString();
          await handleStatusChange(adherenceLog.id, 'snoozed', undefined, snoozeUntil);
        }}
      />
    </>
  );
}
