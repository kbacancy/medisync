'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
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

interface PatientMatch {
  patientId: string
  profileId: string
  name: string
  initials: string
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (patient: NewWaitingPatient) => void
  clinicianId?: string
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

export function NewAppointmentModal({ open, onClose, onCreated, clinicianId }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<PatientMatch | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setQuery('')
    setResults([])
    setSelected(null)
    setShowDropdown(false)
    setReason('')
    setNotFound(false)
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      reset()
      onClose()
    }
  }

  useEffect(() => {
    if (selected || query.length < 2) {
      setResults([])
      setShowDropdown(false)
      setNotFound(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setNotFound(false)
      try {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`)
        const data: PatientMatch[] = await res.json()
        setResults(data)
        setShowDropdown(true)
        setNotFound(data.length === 0)
      } catch {
        setResults([])
        setNotFound(true)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selected])

  function handleSelect(patient: PatientMatch) {
    setSelected(patient)
    setQuery(patient.name)
    setShowDropdown(false)
    setResults([])
  }

  function handleClearSelection() {
    setSelected(null)
    setQuery('')
    setResults([])
    setShowDropdown(false)
    setNotFound(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !reason || !clinicianId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/telehealth/add-to-waiting-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selected.patientId,
          reason,
          clinicianId,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to add patient')
      }
      const { appointmentId } = await res.json()
      onCreated({
        id: selected.patientId,
        name: selected.name,
        initials: selected.initials,
        reason,
        status: 'waiting',
        waitMinutes: 0,
        appointmentId,
      })
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !!selected && !!reason && !!clinicianId && !submitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Telehealth Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="new-appt-patient">Patient Name</Label>
            <div className="relative">
              <Input
                ref={inputRef}
                id="new-appt-patient"
                placeholder="Search by name…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (selected) setSelected(null)
                }}
                autoComplete="off"
                className={selected ? 'pr-8 border-[#0D6B5E]' : ''}
              />
              {searching && (
                <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-gray-400" />
              )}
              {selected && !searching && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  aria-label="Clear selection"
                >
                  <X className="size-4" />
                </button>
              )}

              {showDropdown && results.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {results.map((p) => (
                    <li key={p.patientId}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 flex items-center gap-2"
                        onClick={() => handleSelect(p)}
                      >
                        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0D6B5E] text-white text-xs font-semibold">
                          {p.initials}
                        </span>
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {showDropdown && notFound && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg px-3 py-2 text-sm text-gray-500">
                  No patients found matching &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
            {selected && (
              <p className="text-xs text-[#0D6B5E] font-medium">
                ✓ Patient verified
              </p>
            )}
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
              disabled={!canSubmit}
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
