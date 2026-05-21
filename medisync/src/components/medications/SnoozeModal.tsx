'use client';

import { useState } from 'react';
import { addMinutes, format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const SNOOZE_OPTIONS = [15, 30, 60] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (minutes: number) => void;
}

export function SnoozeModal({ open, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const reset = () => setSelected(null);

  const handleConfirm = () => {
    if (selected !== null) {
      onConfirm(selected);
      reset();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Snooze reminder</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {SNOOZE_OPTIONS.map((mins) => {
            const remindAt = format(addMinutes(new Date(), mins), 'h:mm a');
            return (
              <button
                key={mins}
                type="button"
                onClick={() => setSelected(mins)}
                className={cn(
                  'flex flex-col items-start px-4 py-3.5 rounded-xl border-2 transition-all text-left active:scale-[0.98]',
                  selected === mins
                    ? 'border-[#0D6B5E] bg-[#0D6B5E]/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <span className="text-base font-semibold text-gray-900">{mins} minutes</span>
                <span className="text-sm text-gray-500">Remind at {remindAt}</span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              reset();
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={selected === null}
            onClick={handleConfirm}
            className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white disabled:opacity-50"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
