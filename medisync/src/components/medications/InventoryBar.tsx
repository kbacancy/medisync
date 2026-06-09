'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  drugName: string;
  remaining: number;
  totalSupply: number;
  daysRemaining: number;
  patientId: string;
  prescriptionId: string;
}

export function InventoryBar({
  remaining,
  totalSupply,
  daysRemaining,
  patientId,
  prescriptionId,
}: Props) {
  const [requesting, setRequesting] = useState(false);

  const pct = totalSupply > 0 ? Math.min(100, Math.round((remaining / totalSupply) * 100)) : 0;
  const isEmpty = remaining === 0;
  const isLow = daysRemaining <= 5;

  const handleRefill = async () => {
    setRequesting(true);
    try {
      const res = await fetch('/api/pharmacy/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, prescriptionId }),
      });
      if (res.ok) {
        toast.success('Refill request sent to pharmacy');
      } else {
        toast.error('Failed to send refill request');
      }
    } catch {
      toast.error('Failed to send refill request');
    } finally {
      setRequesting(false);
    }
  };

  const barColor = isEmpty
    ? 'var(--ms-critical)'
    : isLow
    ? 'var(--ms-warn)'
    : 'var(--ms-primary)';

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, color: 'var(--ms-text-secondary)' }}>
          {remaining} pills remaining out of {totalSupply}
        </span>
        {isLow && (
          <span
            className="font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              fontSize: 10,
              backgroundColor: 'rgba(217,119,6,0.1)',
              color: 'var(--ms-warn)',
            }}
          >
            Low Supply
          </span>
        )}
      </div>

      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--ms-surface-raised)' }}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500')}
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>

      {isLow && (
        <button
          type="button"
          onClick={handleRefill}
          disabled={requesting}
          className="flex items-center gap-1.5 font-medium rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 min-h-[36px]"
          style={{
            fontSize: 12,
            color: 'var(--ms-warn)',
            border: '1px solid rgba(217,119,6,0.3)',
            backgroundColor: 'rgba(217,119,6,0.04)',
          }}
        >
          <ExternalLink className="size-3.5 shrink-0" />
          {requesting ? 'Requesting…' : 'Request Refill at Pharmacy'}
        </button>
      )}
    </div>
  );
}
