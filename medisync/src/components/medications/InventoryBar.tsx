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

  const barColor = isEmpty ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-[#0D6B5E]';

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

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{remaining} pills remaining out of {totalSupply}</span>
        {isLow && (
          <span className="bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full text-[10px]">
            Low Supply
          </span>
        )}
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isLow && (
        <button
          type="button"
          onClick={handleRefill}
          disabled={requesting}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-50 transition-colors disabled:opacity-50 min-h-[36px]"
        >
          <ExternalLink className="size-3.5 shrink-0" />
          {requesting ? 'Requesting…' : 'Request Refill at Pharmacy'}
        </button>
      )}
    </div>
  );
}
