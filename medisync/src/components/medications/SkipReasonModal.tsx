'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const REASONS = [
  'Side effects',
  'Out of stock',
  'Feeling better',
  'Forgot earlier',
  'Doctor advised',
  'Other',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function SkipReasonModal({ open, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState('');

  const reset = () => {
    setSelected(null);
    setCustom('');
  };

  const handleConfirm = () => {
    const reason = selected === 'Other' ? custom.trim() : selected;
    if (reason) {
      onConfirm(reason);
      reset();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      reset();
    }
  };

  const isDisabled = !selected || (selected === 'Other' && !custom.trim());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why are you skipping this dose?</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 py-2">
          {REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setSelected(reason)}
              className={cn(
                'px-4 py-2 rounded-full border-2 text-sm font-medium transition-all',
                selected === reason
                  ? 'border-[#0D6B5E] bg-[#0D6B5E] text-white'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 active:scale-95'
              )}
            >
              {reason}
            </button>
          ))}
        </div>

        {selected === 'Other' && (
          <Input
            placeholder="Describe your reason…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            autoFocus
          />
        )}

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
            disabled={isDisabled}
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
