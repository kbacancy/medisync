'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface NewWaitingPatient {
  id: string
  name: string
  initials: string
  reason: string
  status: 'waiting'
  waitMinutes: number
  appointmentId: string
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (patient: NewWaitingPatient) => void
}

const VISIT_REASONS = [
  'Follow-up: General',
  'Follow-up: Migraine',
  'Follow-up: Hypertension',
  'Follow-up: Diabetes',
  'Chest Pain Assessment',
  'Medication Review',
  'Post-Surgery Review',
  'Diabetes Check-in',
  'Annual Wellness Visit',
  'Lab Results Review',
  'Mental Health Check-in',
  'Other',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export function NewAppointmentModal({ open, onClose, onCreated }: Props) {
  const [patientName, setPatientName] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setPatientName('')
    setReason('')
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      reset()
      onClose()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientName.trim() || !reason) return
    setSubmitting(true)
    setTimeout(() => {
      const id = `p-${Date.now()}`
      onCreated({
        id,
        name: patientName.trim(),
        initials: getInitials(patientName.trim()),
        reason,
        status: 'waiting',
        waitMinutes: 0,
        appointmentId: `appt-${id}`,
      })
      reset()
      setSubmitting(false)
    }, 350)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Telehealth Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="new-appt-patient">Patient Name</Label>
            <Input
              id="new-appt-patient"
              placeholder="e.g. Jane Smith"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Reason for Visit</Label>
            <Select onValueChange={setReason} value={reason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason…" />
              </SelectTrigger>
              <SelectContent>
                {VISIT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onClose() }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !patientName.trim() || !reason}
              className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Adding…
                </>
              ) : (
                'Add to Waiting Room'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
