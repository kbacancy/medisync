'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
}

const EMPTY = {
  fullName: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  bloodType: '',
  phone: '',
}

export function AddPatientModal({ open, onClose }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function reset() {
    setForm(EMPTY)
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      reset()
      onClose()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName.trim() || !form.email.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/patients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          bloodType: form.bloodType || undefined,
          phone: form.phone.trim() || undefined,
        }),
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Even on 409 (already in roster) the server repaired the profile —
        // refresh so the correct name shows in the list immediately.
        if (res.status === 409) {
          router.refresh()
        }
        throw new Error((body as { error?: string }).error ?? 'Failed to add patient')
      }

      toast.success(`${form.fullName.trim()} added to patient roster`)
      reset()
      onClose()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add patient')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="ap-name">Full Name *</Label>
            <Input
              id="ap-name"
              placeholder="e.g. Jane Smith"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-email">Email *</Label>
            <Input
              id="ap-email"
              type="email"
              placeholder="patient@example.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-dob">Date of Birth</Label>
              <Input
                id="ap-dob"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-phone">Phone</Label>
              <Input
                id="ap-phone"
                type="tel"
                placeholder="+1 555 0100"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select onValueChange={(v) => set('gender', v)} value={form.gender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {['Male', 'Female', 'Other', 'Prefer not to say'].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Blood Type</Label>
              <Select onValueChange={(v) => set('bloodType', v)} value={form.bloodType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {bt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              disabled={submitting || !form.fullName.trim() || !form.email.trim()}
              className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Adding…
                </>
              ) : (
                'Add Patient'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
