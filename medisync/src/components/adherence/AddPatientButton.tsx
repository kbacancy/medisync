'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddPatientModal } from './AddPatientModal'

export function AddPatientButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add Patient
      </Button>

      <AddPatientModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
