'use client'

import { useEffect, useRef, useState } from 'react'
import { Phone, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const EMERGENCY_TYPES = [
  { id: 'cardiac_arrest',       label: 'Cardiac Arrest' },
  { id: 'respiratory_distress', label: 'Respiratory Distress' },
  { id: 'drug_overdose',        label: 'Drug Overdose' },
  { id: 'psychiatric_crisis',   label: 'Psychiatric Crisis' },
  { id: 'fall_injury',          label: 'Fall / Injury' },
  { id: 'other',                label: 'Other' },
] as const

type EmergencyTypeId = typeof EMERGENCY_TYPES[number]['id']

interface PatientMatch {
  patientId: string
  name: string
  initials: string
}

interface Props {
  open: boolean
  onClose: () => void
  clinicianName: string
}

export function EmergencyModal({ open, onClose, clinicianName }: Props) {
  const [selectedType, setSelectedType] = useState<EmergencyTypeId | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientMatch | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [notes, setNotes] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function reset() {
    setSelectedType(null)
    setQuery('')
    setResults([])
    setSelectedPatient(null)
    setShowDropdown(false)
    setNotes('')
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) { reset(); onClose() }
  }

  useEffect(() => {
    if (selectedPatient || query.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`)
        const data: PatientMatch[] = await res.json()
        setResults(data)
        setShowDropdown(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, selectedPatient])

  async function handleBroadcast() {
    if (!selectedType) return
    setBroadcasting(true)
    try {
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          patientId: selectedPatient?.patientId,
          notes: notes.trim() || undefined,
          clinicianName,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Broadcast failed')
      }
      toast.error('Emergency alert broadcast to all staff', { duration: 6000 })
      reset()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to broadcast alert')
    } finally {
      setBroadcasting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-red-200">
        {/* Red header */}
        <div className="bg-red-600 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-lg">
              <AlertTriangle className="size-5 shrink-0" />
              Emergency Protocol
            </DialogTitle>
          </DialogHeader>
          <p className="text-red-100 text-xs mt-1">
            Broadcast a critical alert to all on-duty clinical staff.
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Emergency contacts */}
          <div className="flex gap-3">
            <a
              href="tel:911"
              className="flex-1 flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-700 font-semibold text-sm rounded-lg py-3 hover:bg-red-100 transition-colors"
            >
              <Phone className="size-4" />
              Call 911
            </a>
            <a
              href="tel:18002221222"
              className="flex-1 flex items-center justify-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-sm rounded-lg py-3 hover:bg-orange-100 transition-colors"
            >
              <Phone className="size-4" />
              Poison Control
            </a>
          </div>

          {/* Emergency type */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Emergency Type <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {EMERGENCY_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={cn(
                    'text-xs font-medium px-3 py-2 rounded-lg border transition-colors text-left',
                    selectedType === t.id
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'border-gray-200 text-gray-700 hover:border-red-300 hover:bg-red-50'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional patient */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-gray-800">Patient <span className="text-gray-400 font-normal">(optional)</span></p>
            <div className="relative">
              {selectedPatient ? (
                <div className="flex items-center gap-2 px-3 py-2 border border-[#0D6B5E] rounded-lg bg-teal-50 text-sm text-gray-800">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0D6B5E] text-white text-xs font-semibold">
                    {selectedPatient.initials}
                  </span>
                  <span className="flex-1 font-medium">{selectedPatient.name}</span>
                  <button
                    onClick={() => { setSelectedPatient(null); setQuery('') }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Search patient name…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value) }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                />
              )}

              {showDropdown && results.length > 0 && !selectedPatient && (
                <ul className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                  {searching && (
                    <li className="px-3 py-2 text-xs text-gray-400">Searching…</li>
                  )}
                  {results.map((p) => (
                    <li key={p.patientId}>
                      <button
                        type="button"
                        onClick={() => { setSelectedPatient(p); setQuery(p.name); setShowDropdown(false) }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2"
                      >
                        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0D6B5E] text-white text-xs font-semibold">
                          {p.initials}
                        </span>
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-gray-800">Notes <span className="text-gray-400 font-normal">(optional)</span></p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Brief situation summary…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => { reset(); onClose() }}
              disabled={broadcasting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBroadcast}
              disabled={!selectedType || broadcasting}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white"
            >
              {broadcasting ? 'Broadcasting…' : 'Broadcast Alert'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
