'use client';

import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { DoseCard } from './DoseCard';
import type { PrescriptionWithDispense, AdherenceLog } from '@/types';

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'bedtime';

const TIME_SLOTS: Array<{
  slot: TimeSlot;
  label: string;
  icon: string;
  range: string;
}> = [
  { slot: 'morning',   label: 'Morning',   icon: '🌅', range: '6AM–12PM' },
  { slot: 'afternoon', label: 'Afternoon', icon: '☀️', range: '12PM–5PM' },
  { slot: 'evening',   label: 'Evening',   icon: '🌙', range: '5PM–9PM'  },
  { slot: 'bedtime',   label: 'Bedtime',   icon: '🌛', range: '9PM+'     },
];

function getSlotForHour(hour: number): TimeSlot {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'bedtime';
}

interface Props {
  prescriptions: PrescriptionWithDispense[];
  adherenceLogs: AdherenceLog[];
  patientId: string;
}

export function MedicationTimeline({ prescriptions, adherenceLogs: initialLogs, patientId }: Props) {
  const [logs, setLogs] = useState<AdherenceLog[]>(initialLogs);
  const [collapsed, setCollapsed] = useState<Set<TimeSlot>>(new Set());

  const logsBySlot = TIME_SLOTS.reduce<
    Record<TimeSlot, Array<{ prescription: PrescriptionWithDispense; log: AdherenceLog }>>
  >(
    (acc, { slot }) => { acc[slot] = []; return acc; },
    { morning: [], afternoon: [], evening: [], bedtime: [] }
  );

  for (const log of logs) {
    const hour = new Date(log.scheduled_time).getHours();
    const slot = getSlotForHour(hour);
    const prescription = prescriptions.find((rx) => rx.id === log.prescription_id);
    if (prescription) {
      logsBySlot[slot].push({ prescription, log });
    }
  }

  useEffect(() => {
    const autoCollapse = new Set<TimeSlot>();
    for (const { slot } of TIME_SLOTS) {
      const items = logsBySlot[slot];
      if (items.length > 0 && items.every((i) => i.log.status === 'taken')) {
        autoCollapse.add(slot);
      }
    }
    setCollapsed(autoCollapse);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs]);

  const handleStatusChange = useCallback(
    async (
      logId: string,
      status: AdherenceLog['status'],
      reason?: string,
      snoozeUntil?: string
    ) => {
      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? {
                ...log,
                status,
                skip_reason: reason ?? log.skip_reason,
                snooze_until: snoozeUntil ?? log.snooze_until,
                actual_time: status === 'taken' ? new Date().toISOString() : log.actual_time,
              }
            : log
        )
      );

      try {
        const rx = prescriptions.find(
          (p) => p.id === logs.find((l) => l.id === logId)?.prescription_id
        );
        await fetch('/api/adherence/log-dose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logId, patientId, prescriptionId: rx?.id, status, reason, snoozeUntil }),
        });
      } catch {
        setLogs(initialLogs);
      }
    },
    [initialLogs, patientId, prescriptions, logs]
  );

  const toggleCollapse = (slot: TimeSlot) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

  const takenCount = logs.filter((l) => l.status === 'taken').length;
  const totalCount = logs.length;
  const progressPct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  const dayLabel = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="p-4 space-y-5 pb-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--ms-text-primary)',
          }}
        >
          My Medications
        </h1>
        <span style={{ fontSize: 13, color: 'var(--ms-text-secondary)' }}>{dayLabel}</span>
      </div>

      {/* Progress card */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{
          backgroundColor: 'var(--ms-surface)',
          boxShadow: 'var(--ms-shadow-sm)',
          border: '1px solid var(--ms-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ms-text-primary)' }}>
            Today's Progress
          </span>
          <span style={{ fontSize: 13, color: 'var(--ms-text-secondary)' }}>
            {takenCount} of {totalCount} doses taken
          </span>
        </div>
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--ms-surface-raised)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%`, backgroundColor: 'var(--ms-primary)' }}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--ms-text-tertiary)' }}>{progressPct}% complete</p>
      </div>

      {/* Time slot sections */}
      {TIME_SLOTS.map(({ slot, label, icon, range }) => {
        const items = logsBySlot[slot];
        const allTaken = items.length > 0 && items.every((i) => i.log.status === 'taken');
        const isCollapsed = collapsed.has(slot);

        return (
          <div key={slot} className="space-y-2">
            <button
              type="button"
              onClick={() => toggleCollapse(slot)}
              className="w-full flex items-center gap-2 text-left"
            >
              <span className="text-lg">{icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ms-text-secondary)' }}>
                {label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ms-text-tertiary)' }}>{range}</span>
              {allTaken && (
                <CheckCircle2
                  className="size-4 ml-auto shrink-0"
                  style={{ color: 'var(--ms-ok)' }}
                />
              )}
              {items.length > 0 && !allTaken && (
                <span className="ml-auto" style={{ fontSize: 12, color: 'var(--ms-text-tertiary)' }}>
                  {items.filter((i) => i.log.status === 'taken').length}/{items.length}
                </span>
              )}
            </button>

            {!isCollapsed && (
              <>
                {items.length === 0 ? (
                  <p
                    className="ml-7"
                    style={{ fontSize: 12, color: 'var(--ms-text-tertiary)' }}
                  >
                    No medications scheduled
                  </p>
                ) : (
                  <div className="space-y-2">
                    {items.map(({ prescription, log }) => (
                      <DoseCard
                        key={log.id}
                        prescription={prescription}
                        adherenceLog={log}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {isCollapsed && items.length > 0 && (
              <p
                className="ml-7 font-medium"
                style={{ fontSize: 12, color: 'var(--ms-ok)' }}
              >
                All {items.length} dose{items.length > 1 ? 's' : ''} taken ✓
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
