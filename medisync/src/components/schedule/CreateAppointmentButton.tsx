'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PatientOption {
  patient_id: string
  full_name: string
}

const VISIT_REASONS = [
  'Medication review',
  'Follow-up consultation',
  'Blood pressure check',
  'Annual physical',
  'Diabetes check-in',
  'Lab results review',
  'Post-surgery review',
  'Mental health check-in',
  'Other',
]

export function CreateAppointmentButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [patientId, setPatientId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [type, setType] = useState<'telehealth' | 'in_person'>('telehealth')
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('patients')
      .select('id, profile:profiles!profile_id(full_name)')
      .order('updated_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!data) return
        const opts: PatientOption[] = (data as {
          id: string
          profile: { full_name: string } | { full_name: string }[] | null
        }[]).map((p) => {
          const prof = Array.isArray(p.profile) ? p.profile[0] : p.profile
          return { patient_id: p.id, full_name: prof?.full_name ?? 'Unknown' }
        })
        setPatients(opts)
      })
  }, [open])

  function reset() {
    setPatientId('')
    setDate('')
    setTime('')
    setType('telehealth')
    setReason('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId || !date || !time || !reason) return

    const scheduled_at = new Date(`${date}T${time}:00`).toISOString()

    const res = await fetch('/api/appointments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, scheduled_at, type, reason }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Failed to create appointment')
      return
    }

    toast.success('Appointment scheduled')
    setOpen(false)
    reset()
    startTransition(() => router.refresh())
  }

  const canSubmit = Boolean(patientId && date && time && reason)

  return (
    <>
      <Button
        className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        New Appointment
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); setOpen(false) } else setOpen(true) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient…" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.patient_id} value={p.patient_id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="appt-date">Date</Label>
                <Input
                  id="appt-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appt-time">Time</Label>
                <Input
                  id="appt-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telehealth">Telehealth (Video)</SelectItem>
                  <SelectItem value="in_person">In-Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reason for Visit</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason…" />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { reset(); setOpen(false) }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit || isPending}
                className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white"
              >
                {isPending ? (
                  <><Loader2 className="size-4 animate-spin mr-2" />Saving…</>
                ) : (
                  'Schedule'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
