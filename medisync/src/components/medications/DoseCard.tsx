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

const CATEGORY_COLORS: Record<string, string> = {
  cardiovascular: 'bg-red-100 text-red-600',
  diabetes: 'bg-blue-100 text-blue-600',
  antihypertensive: 'bg-purple-100 text-purple-600',
  antibiotic: 'bg-orange-100 text-orange-600',
  thyroid: 'bg-pink-100 text-pink-600',
  respiratory: 'bg-sky-100 text-sky-600',
  default: 'bg-[#0D6B5E]/10 text-[#0D6B5E]',
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
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
            <CheckCircle className="size-3" />
            Taken ✓
          </span>
          {actualTime && (
            <p className="text-[10px] text-gray-400 mt-0.5 text-right">at {actualTime}</p>
          )}
        </div>
      );
    case 'skipped':
      return (
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded-full">
            <XCircle className="size-3" />
            Skipped
          </span>
          {log.skip_reason && (
            <p className="text-[10px] text-red-400 mt-0.5 text-right max-w-[100px] break-words">
              {log.skip_reason}
            </p>
          )}
        </div>
      );
    case 'snoozed':
      return (
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-full">
            <Clock className="size-3" />
            Snoozed
          </span>
          {snoozeTime && (
            <p className="text-[10px] text-amber-500 mt-0.5 text-right">Remind at {snoozeTime}</p>
          )}
        </div>
      );
    case 'missed':
      return (
        <span className="inline-flex items-center border border-red-400 text-red-500 text-xs font-semibold px-2 py-1 rounded-full shrink-0">
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
        status === 'taken' ? 'log-dose' : status === 'skipped' ? 'skip-dose' : 'snooze-dose'
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
      })
      return
    }
    await onStatusChange(logId, status, reason, snoozeUntil)
  }

  const categoryKey = prescription.medication_category ?? 'default';
  const iconColor = CATEGORY_COLORS[categoryKey] ?? CATEGORY_COLORS.default;

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

  const borderClass = {
    pending: 'border-l-4 border-l-[#0D6B5E]',
    taken: 'border-l-4 border-l-green-500 bg-green-50',
    skipped: 'border-l-4 border-l-red-400 bg-red-50 opacity-75',
    snoozed: 'border-l-4 border-l-amber-400 bg-amber-50',
    missed: 'border-l-4 border-l-red-500 opacity-60',
    late: 'border-l-4 border-l-orange-400',
  }[adherenceLog.status] ?? '';

  return (
    <>
      <div
        className={cn(
          'bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3',
          borderClass
        )}
      >
        <div
          className={cn(
            'size-10 rounded-full flex items-center justify-center shrink-0 mt-0.5',
            iconColor
          )}
        >
          <Pill className="size-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-base leading-tight truncate">
                {prescription.medication_name}
              </p>
              <p className="text-sm text-gray-500">
                {prescription.dosage} · {prescription.form ?? 'Tablet'}
              </p>
            </div>
            <StatusBadge log={adherenceLog} actualTime={actualTime} snoozeTime={snoozeTime} />
          </div>

          {prescription.instructions && (
            <p className="text-xs text-gray-400 leading-relaxed">{prescription.instructions}</p>
          )}

          <p className="text-xs text-gray-400">Scheduled {scheduledTime}</p>

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
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] bg-[#0D6B5E] text-white text-sm font-semibold rounded-lg active:scale-95 transition-transform"
              >
                <CheckCircle className="size-4" />
                Take
              </button>
              <button
                type="button"
                onClick={() => setSkipOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] border border-gray-300 text-gray-700 text-sm font-medium rounded-lg active:scale-95 transition-transform hover:bg-gray-50"
              >
                <XCircle className="size-4" />
                Skip
              </button>
              <button
                type="button"
                onClick={() => setSnoozeOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] border border-gray-300 text-gray-700 text-sm font-medium rounded-lg active:scale-95 transition-transform hover:bg-gray-50"
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
