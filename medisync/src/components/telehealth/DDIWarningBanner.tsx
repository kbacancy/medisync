'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const OVERRIDE_REASONS = [
  { code: 'CLI-001', label: 'Clinically appropriate — benefit outweighs risk' },
  { code: 'CLI-002', label: 'Patient already on combination — monitoring in place' },
  { code: 'CLI-003', label: 'Alternative unavailable or contraindicated' },
  { code: 'CLI-004', label: 'Patient consent obtained and documented' },
  { code: 'CLI-005', label: 'Dose adjusted to mitigate interaction' },
]

const SEVERITY_CONFIG = {
  mild: { label: 'Mild', color: 'text-amber-700' },
  moderate: { label: 'Moderate', color: 'text-orange-700' },
  severe: { label: 'Severe', color: 'text-red-700' },
}

interface DDIWarningBannerProps {
  visible: boolean
  drugA: string
  drugB: string
  severity: 'mild' | 'moderate' | 'severe'
  description: string
  onOverride: (code: string) => void
  onCancel: () => void
}

export function DDIWarningBanner({
  visible,
  drugA,
  drugB,
  severity,
  description,
  onOverride,
  onCancel,
}: DDIWarningBannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState('')

  if (!visible) return null

  const sevConfig = SEVERITY_CONFIG[severity]

  function handleOverride() {
    if (selectedCode) {
      onOverride(selectedCode)
      setDialogOpen(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />

      {/* Banner */}
      <div className="fixed top-[64px] left-[240px] right-0 z-50 bg-red-600 text-white px-6 py-4 flex items-start gap-4">
        <AlertTriangle className="size-6 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm tracking-wide">DRUG INTERACTION WARNING</p>
          <p className="text-sm mt-0.5">
            <span className="font-semibold">{drugA}</span> + <span className="font-semibold">{drugB}</span>
            {' '}— <span className={sevConfig.color + ' font-semibold bg-white/10 px-1 rounded'}>{sevConfig.label}</span>
          </p>
          <p className="text-xs text-red-100 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="bg-white text-red-700 border-white hover:bg-red-50 text-xs font-semibold"
            onClick={() => setDialogOpen(true)}
          >
            Select Override Code
          </Button>
          <Button
            size="sm"
            className="bg-red-800 hover:bg-red-900 text-white text-xs font-semibold border-0"
            onClick={onCancel}
          >
            Cancel Prescription
          </Button>
        </div>
      </div>

      {/* Override dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Override Reason</DialogTitle>
            <DialogDescription>
              Choose a clinical justification to override this drug interaction warning.
              This will be documented in the patient record.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Select onValueChange={setSelectedCode} value={selectedCode}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {OVERRIDE_REASONS.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{r.code}</span>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Back
            </Button>
            <Button
              disabled={!selectedCode}
              onClick={handleOverride}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
