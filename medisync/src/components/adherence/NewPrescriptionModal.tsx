'use client'

import { useState, useRef } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'
import { searchDrugs, type DrugEntry } from '@/lib/drugs/catalogue'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DDIWarningBanner } from '@/components/adherence/DDIWarningBanner'

const schema = z.object({
  drugName: z.string().min(1, 'Drug name is required'),
  strength: z.string().min(1, 'Strength is required'),
  form: z.enum(['Tablet', 'Capsule', 'Liquid', 'Injection']),
  instructions: z.string().optional(),
  frequency: z.enum(['Once daily', 'Twice daily', 'Three times daily', 'As needed']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  quantityDispensed: z.coerce.number().min(1, 'Must be at least 1'),
  daysSupply: z.coerce.number().min(1, 'Must be at least 1'),
})

type FormValues = z.infer<typeof schema>

const TIME_OF_DAY_OPTIONS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'bedtime', label: 'Bedtime' },
]


interface DDIResult {
  hasSevereInteraction?: boolean
  hasModerateInteraction?: boolean
  drugA: string
  drugB: string
  severity: 'mild' | 'moderate' | 'severe'
  description: string
}

interface Props {
  patientId: string
  doctorId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NewPrescriptionModal({
  patientId,
  doctorId,
  open,
  onClose,
  onSuccess,
}: Props) {
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [ddiWarning, setDdiWarning] = useState<DDIResult | null>(null)
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null)
  const [drugSuggestions, setDrugSuggestions] = useState<DrugEntry[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const drugInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      form: 'Tablet',
      frequency: 'Once daily',
      quantityDispensed: 30,
      daysSupply: 30,
    },
  })

  function toggleTime(id: string) {
    setSelectedTimes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  function handleDrugInput(value: string) {
    setValue('drugName', value)
    const matches = searchDrugs(value)
    setDrugSuggestions(matches)
    setShowSuggestions(matches.length > 0)
    setActiveIndex(-1)
  }

  function selectDrug(drug: DrugEntry) {
    setValue('drugName', drug.name)
    if (drug.defaultStrength) setValue('strength', drug.defaultStrength)
    if (drug.defaultForm)     setValue('form', drug.defaultForm)
    setShowSuggestions(false)
    setActiveIndex(-1)
  }

  function handleDrugKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || drugSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, drugSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectDrug(drugSuggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveIndex(-1)
    }
  }

  async function submitPrescription(values: FormValues, overrideCode?: string) {
    const res = await fetch('/api/prescriptions/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        doctorId,
        drugName: values.drugName,
        strength: values.strength,
        form: values.form,
        instructions: values.instructions,
        frequency: values.frequency,
        timeOfDay: selectedTimes,
        startDate: values.startDate,
        endDate: values.endDate || undefined,
        status: 'active',
        quantityDispensed: values.quantityDispensed,
        daysSupply: values.daysSupply,
        overrideCode,
      }),
    })
    if (!res.ok) throw new Error('Failed to create prescription')

    const { prescription } = await res.json()

    await fetch('/api/pharmacy/dispense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, prescriptionId: prescription.id }),
    })
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const ddiRes = await fetch('/api/ddi-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, newDrugName: values.drugName }),
      })
      const ddi: DDIResult & { hasInteraction?: boolean } = await ddiRes.json()

      if (ddi.hasSevereInteraction) {
        setPendingValues(values)
        setDdiWarning(ddi)
        setSubmitting(false)
        return
      }

      if (ddi.hasModerateInteraction) {
        toast.warning(
          `Moderate interaction: ${ddi.drugA} + ${ddi.drugB}. ${ddi.description}`,
          { duration: 6000 }
        )
      }

      await submitPrescription(values)
      toast.success('Prescription created successfully')
      reset()
      setSelectedTimes([])
      onSuccess()
      onClose()
    } catch {
      toast.error('Failed to create prescription')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDDIProceed(overrideCode: string) {
    if (!pendingValues) return
    setSubmitting(true)
    try {
      await submitPrescription(pendingValues, overrideCode)
      toast.warning('Prescription created with clinical override. Document in notes.')
      setDdiWarning(null)
      setPendingValues(null)
      reset()
      setSelectedTimes([])
      onSuccess()
      onClose()
    } catch {
      toast.error('Failed to create prescription')
    } finally {
      setSubmitting(false)
    }
  }

  function handleDDICancel() {
    setDdiWarning(null)
    setPendingValues(null)
  }

  return (
    <>
      <Dialog open={open && !ddiWarning} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Prescription</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
            <div className="space-y-1.5 relative">
              <Label htmlFor="drugName">Drug Name</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
                <input
                  id="drugName"
                  ref={drugInputRef}
                  {...register('drugName')}
                  onChange={(e) => handleDrugInput(e.target.value)}
                  onKeyDown={handleDrugKeyDown}
                  onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveIndex(-1) }, 160)}
                  autoComplete="off"
                  placeholder="Search medicine name…"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#0D6B5E] focus:border-[#0D6B5E] transition-colors"
                />
              </div>
              {showSuggestions && drugSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                  <div className="max-h-56 overflow-y-auto">
                    {drugSuggestions.map((drug, idx) => (
                      <button
                        key={drug.name}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => selectDrug(drug)}
                        className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 transition-colors border-b border-gray-50 last:border-0 ${
                          activeIndex === idx ? 'bg-[#0D6B5E]/8' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-900 block truncate">{drug.name}</span>
                          {drug.defaultStrength && (
                            <span className="text-xs text-gray-400">{drug.defaultStrength}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0 whitespace-nowrap">
                          {drug.category}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400">↑↓ navigate · Enter to select · Esc to close</p>
                  </div>
                </div>
              )}
              {errors.drugName && (
                <p className="text-xs text-red-500">{errors.drugName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="strength">Strength</Label>
                <Input id="strength" placeholder="e.g. 10mg" {...register('strength')} />
                {errors.strength && (
                  <p className="text-xs text-red-500">{errors.strength.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Form</Label>
                <Select
                  onValueChange={(v) => setValue('form', v as FormValues['form'])}
                  defaultValue="Tablet"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Tablet', 'Capsule', 'Liquid', 'Injection'].map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="e.g. Take with food in the morning"
                rows={2}
                {...register('instructions')}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                onValueChange={(v) => setValue('frequency', v as FormValues['frequency'])}
                defaultValue="Once daily"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Once daily', 'Twice daily', 'Three times daily', 'As needed'].map(
                    (f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Time of Day</Label>
              <div className="flex flex-wrap gap-2">
                {TIME_OF_DAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleTime(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      selectedTimes.includes(opt.id)
                        ? 'bg-[#0D6B5E] text-white border-[#0D6B5E]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#0D6B5E]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" {...register('startDate')} />
                {errors.startDate && (
                  <p className="text-xs text-red-500">{errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date (optional)</Label>
                <Input id="endDate" type="date" {...register('endDate')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantityDispensed">Quantity</Label>
                <Input
                  id="quantityDispensed"
                  type="number"
                  min={1}
                  {...register('quantityDispensed')}
                />
                {errors.quantityDispensed && (
                  <p className="text-xs text-red-500">{errors.quantityDispensed.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="daysSupply">Days Supply</Label>
                <Input
                  id="daysSupply"
                  type="number"
                  min={1}
                  {...register('daysSupply')}
                />
                {errors.daysSupply && (
                  <p className="text-xs text-red-500">{errors.daysSupply.message}</p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Checking…
                  </>
                ) : (
                  'Create Prescription'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {ddiWarning && (
        <DDIWarningBanner
          drugA={ddiWarning.drugA}
          drugB={ddiWarning.drugB}
          severity={ddiWarning.severity}
          description={ddiWarning.description}
          onProceed={handleDDIProceed}
          onCancel={handleDDICancel}
        />
      )}
    </>
  )
}
