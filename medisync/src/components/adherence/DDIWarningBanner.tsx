'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const OVERRIDE_CODES = [
  { code: 'OVR-001', label: 'Benefit outweighs risk' },
  { code: 'OVR-002', label: 'Patient informed and consented' },
  { code: 'OVR-003', label: 'Alternative not available' },
  { code: 'OVR-004', label: 'Physician clinical judgment' },
]

interface DDIWarningBannerProps {
  drugA: string
  drugB: string
  severity: 'mild' | 'moderate' | 'severe'
  description: string
  onProceed: (overrideCode: string) => void
  onCancel: () => void
}

export function DDIWarningBanner({
  drugA,
  drugB,
  severity,
  description,
  onProceed,
  onCancel,
}: DDIWarningBannerProps) {
  const [selectedCode, setSelectedCode] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl overflow-hidden">
        <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
          <AlertTriangle className="size-6 text-white shrink-0" />
          <div>
            <p className="text-white font-bold tracking-wide text-sm">
              DRUG INTERACTION WARNING
            </p>
            <p className="text-red-100 text-xs mt-0.5">
              Clinical review required before proceeding
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 justify-center">
            <span className="bg-gray-100 text-gray-800 font-semibold px-3 py-1.5 rounded-lg text-sm">
              {drugA}
            </span>
            <span className="text-gray-400 text-sm font-medium">+</span>
            <span className="bg-gray-100 text-gray-800 font-semibold px-3 py-1.5 rounded-lg text-sm">
              {drugB}
            </span>
          </div>

          <div className="flex justify-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                severity === 'severe'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : severity === 'moderate'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {severity} interaction
            </span>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed text-center">
            {description}
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Override Code Required
            </label>
            <Select onValueChange={setSelectedCode} value={selectedCode}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select clinical justification…" />
              </SelectTrigger>
              <SelectContent>
                {OVERRIDE_CODES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="font-mono text-xs text-gray-400 mr-2">{c.code}</span>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="px-6 pb-5 flex items-center gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel Prescription
          </Button>
          <Button
            disabled={!selectedCode}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
            onClick={() => selectedCode && onProceed(selectedCode)}
          >
            Proceed with Override
          </Button>
        </div>
      </div>
    </div>
  )
}
