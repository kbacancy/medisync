'use client'

import { useState, useMemo } from 'react'
import { Search, X, FlaskConical, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ─── Lab test catalog ─────────────────────────────────────────────────────────

export interface LabTest {
  id: string
  name: string
  category: string
}

const LAB_CATALOG: { category: string; tests: Omit<LabTest, 'category'>[] }[] = [
  {
    category: 'Hematology',
    tests: [
      { id: 'cbc', name: 'Complete Blood Count (CBC)' },
      { id: 'cbc_diff', name: 'CBC with Differential' },
      { id: 'esr', name: 'Erythrocyte Sedimentation Rate (ESR)' },
      { id: 'reticulocyte', name: 'Reticulocyte Count' },
      { id: 'peripheral_smear', name: 'Peripheral Blood Smear' },
      { id: 'pt_inr', name: 'PT/INR' },
      { id: 'aptt', name: 'aPTT' },
      { id: 'd_dimer', name: 'D-Dimer' },
      { id: 'fibrinogen', name: 'Fibrinogen' },
    ],
  },
  {
    category: 'Metabolic Panel',
    tests: [
      { id: 'bmp', name: 'Basic Metabolic Panel (BMP)' },
      { id: 'cmp', name: 'Comprehensive Metabolic Panel (CMP)' },
      { id: 'glucose_fasting', name: 'Glucose (Fasting)' },
      { id: 'hba1c', name: 'HbA1c' },
      { id: 'gtt', name: 'Glucose Tolerance Test (GTT)' },
      { id: 'electrolytes', name: 'Electrolytes (Na/K/Cl/CO2)' },
    ],
  },
  {
    category: 'Lipid Panel',
    tests: [
      { id: 'lipid_panel', name: 'Lipid Panel' },
      { id: 'total_cholesterol', name: 'Total Cholesterol' },
      { id: 'hdl', name: 'HDL Cholesterol' },
      { id: 'ldl', name: 'LDL Cholesterol' },
      { id: 'triglycerides', name: 'Triglycerides' },
      { id: 'apob', name: 'Apolipoprotein B' },
    ],
  },
  {
    category: 'Liver Function',
    tests: [
      { id: 'lft', name: 'Liver Function Tests (LFT)' },
      { id: 'alt', name: 'ALT (Alanine Aminotransferase)' },
      { id: 'ast', name: 'AST (Aspartate Aminotransferase)' },
      { id: 'alp', name: 'Alkaline Phosphatase (ALP)' },
      { id: 'bilirubin', name: 'Bilirubin (Total / Direct)' },
      { id: 'ggt', name: 'GGT (Gamma-Glutamyl Transferase)' },
      { id: 'albumin', name: 'Albumin' },
    ],
  },
  {
    category: 'Kidney Function',
    tests: [
      { id: 'bun', name: 'BUN (Blood Urea Nitrogen)' },
      { id: 'creatinine', name: 'Creatinine' },
      { id: 'egfr', name: 'eGFR' },
      { id: 'uric_acid', name: 'Uric Acid' },
      { id: 'cystatin_c', name: 'Cystatin C' },
    ],
  },
  {
    category: 'Thyroid',
    tests: [
      { id: 'tsh', name: 'TSH (Thyroid Stimulating Hormone)' },
      { id: 'free_t4', name: 'Free T4' },
      { id: 'free_t3', name: 'Free T3' },
      { id: 'total_t4', name: 'Total T4' },
      { id: 'tpo_antibodies', name: 'TPO Antibodies' },
    ],
  },
  {
    category: 'Cardiac Markers',
    tests: [
      { id: 'troponin_i', name: 'Troponin I' },
      { id: 'troponin_t', name: 'Troponin T (High-Sensitivity)' },
      { id: 'ck_mb', name: 'CK-MB' },
      { id: 'bnp', name: 'BNP (B-type Natriuretic Peptide)' },
      { id: 'nt_probnp', name: 'NT-proBNP' },
      { id: 'myoglobin', name: 'Myoglobin' },
    ],
  },
  {
    category: 'Inflammatory Markers',
    tests: [
      { id: 'crp', name: 'CRP (C-Reactive Protein)' },
      { id: 'hscrp', name: 'hsCRP (High-Sensitivity CRP)' },
      { id: 'ferritin', name: 'Ferritin' },
      { id: 'il6', name: 'Interleukin-6 (IL-6)' },
      { id: 'procalcitonin', name: 'Procalcitonin' },
    ],
  },
  {
    category: 'Autoimmune / Rheumatology',
    tests: [
      { id: 'rf', name: 'Rheumatoid Factor (RF)' },
      { id: 'ana', name: 'ANA (Antinuclear Antibody)' },
      { id: 'anti_dsdna', name: 'Anti-dsDNA' },
      { id: 'complement_c3', name: 'Complement C3' },
      { id: 'complement_c4', name: 'Complement C4' },
      { id: 'anti_ccp', name: 'Anti-CCP Antibody' },
    ],
  },
  {
    category: 'Infectious Disease',
    tests: [
      { id: 'blood_culture', name: 'Blood Culture' },
      { id: 'urine_culture', name: 'Urine Culture & Sensitivity' },
      { id: 'hiv', name: 'HIV 1/2 Ag/Ab Combination' },
      { id: 'hbsag', name: 'Hepatitis B Surface Antigen (HBsAg)' },
      { id: 'hcv_ab', name: 'Hepatitis C Antibody' },
      { id: 'covid_pcr', name: 'COVID-19 PCR' },
      { id: 'flu_ab', name: 'Influenza A/B Antigen' },
      { id: 'strep_rapid', name: 'Rapid Strep Test' },
      { id: 'tb_igra', name: 'TB IGRA (QuantiFERON)' },
    ],
  },
  {
    category: 'Hormones / Endocrine',
    tests: [
      { id: 'testosterone_total', name: 'Testosterone (Total)' },
      { id: 'testosterone_free', name: 'Testosterone (Free)' },
      { id: 'estradiol', name: 'Estradiol (E2)' },
      { id: 'fsh', name: 'FSH' },
      { id: 'lh', name: 'LH' },
      { id: 'cortisol', name: 'Cortisol (Morning)' },
      { id: 'dhea_s', name: 'DHEA-S' },
      { id: 'prolactin', name: 'Prolactin' },
      { id: 'igf1', name: 'IGF-1' },
      { id: 'pth', name: 'PTH (Parathyroid Hormone)' },
      { id: 'insulin_fasting', name: 'Insulin (Fasting)' },
    ],
  },
  {
    category: 'Vitamins & Minerals',
    tests: [
      { id: 'vitamin_d', name: 'Vitamin D (25-OH)' },
      { id: 'vitamin_b12', name: 'Vitamin B12' },
      { id: 'folate', name: 'Folate (Serum)' },
      { id: 'iron_panel', name: 'Iron Panel (Fe / TIBC / Ferritin)' },
      { id: 'magnesium', name: 'Magnesium' },
      { id: 'zinc', name: 'Zinc' },
      { id: 'copper', name: 'Copper' },
      { id: 'calcium', name: 'Calcium' },
      { id: 'phosphorus', name: 'Phosphorus' },
    ],
  },
  {
    category: 'Cancer Markers',
    tests: [
      { id: 'psa', name: 'PSA (Prostate-Specific Antigen)' },
      { id: 'ca125', name: 'CA-125 (Ovarian)' },
      { id: 'ca19_9', name: 'CA 19-9 (Pancreatic / Biliary)' },
      { id: 'cea', name: 'CEA (Carcinoembryonic Antigen)' },
      { id: 'afp', name: 'AFP (Alpha-Fetoprotein)' },
      { id: 'ldh', name: 'LDH (Lactate Dehydrogenase)' },
    ],
  },
  {
    category: 'Urinalysis',
    tests: [
      { id: 'ua', name: 'Urinalysis (UA)' },
      { id: 'urine_microalbumin', name: 'Urine Microalbumin' },
      { id: 'urine_pcr', name: 'Urine Protein/Creatinine Ratio' },
      { id: 'urine_pregnancy', name: 'Urine Pregnancy Test (hCG)' },
      { id: 'urine_drug_screen', name: 'Urine Drug Screen' },
    ],
  },
]

// Flat list for search
const ALL_TESTS: LabTest[] = LAB_CATALOG.flatMap(({ category, tests }) =>
  tests.map((t) => ({ ...t, category }))
)

// ─── Priority config ─────────────────────────────────────────────────────────

const PRIORITIES = [
  { id: 'routine', label: 'Routine', description: 'Standard turnaround' },
  { id: 'stat', label: 'STAT', description: 'Urgent — within hours' },
  { id: 'urgent', label: 'Urgent', description: 'Same day' },
] as const

type Priority = 'routine' | 'stat' | 'urgent'

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  patientId: string
  clinicianId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NewLabOrderModal({ patientId, clinicianId, open, onClose, onSuccess }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<LabTest[]>([])
  const [priority, setPriority] = useState<Priority>('routine')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Filtered catalog when searching
  const filteredCatalog = useMemo(() => {
    if (!query.trim()) return LAB_CATALOG
    const q = query.toLowerCase()
    return LAB_CATALOG
      .map(({ category, tests }) => ({
        category,
        tests: tests.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            category.toLowerCase().includes(q)
        ),
      }))
      .filter(({ tests }) => tests.length > 0)
  }, [query])

  function isSelected(id: string) {
    return selected.some((t) => t.id === id)
  }

  function toggleTest(test: LabTest) {
    setSelected((prev) =>
      prev.some((t) => t.id === test.id)
        ? prev.filter((t) => t.id !== test.id)
        : [...prev, test]
    )
  }

  function removeSelected(id: string) {
    setSelected((prev) => prev.filter((t) => t.id !== id))
  }

  function toggleCollapse(category: string) {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  function handleClose() {
    setQuery('')
    setSelected([])
    setPriority('routine')
    setNotes('')
    onClose()
  }

  async function handleSubmit() {
    if (selected.length === 0) {
      toast.error('Select at least one test')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/lab-orders/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, clinicianId, priority, tests: selected, notes: notes || undefined }),
      })
      if (!res.ok) throw new Error('Failed to place lab order')
      toast.success(`${selected.length} test${selected.length > 1 ? 's' : ''} ordered (${priority})`)
      onSuccess()
      handleClose()
    } catch {
      toast.error('Failed to place lab order')
    } finally {
      setSubmitting(false)
    }
  }

  const priorityColor: Record<Priority, string> = {
    routine: 'bg-[#0D6B5E] border-[#0D6B5E] text-white',
    stat: 'bg-red-600 border-red-600 text-white',
    urgent: 'bg-amber-500 border-amber-500 text-white',
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-5 text-[#0D6B5E]" />
            Order Lab Tests
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tests… e.g. CBC, TSH, Troponin"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#0D6B5E] focus:border-[#0D6B5E] focus:bg-white transition-colors"
            />
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Selected ({selected.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selected.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 text-xs bg-[#0D6B5E]/10 text-[#0D6B5E] border border-[#0D6B5E]/20 rounded-full px-2.5 py-0.5 font-medium"
                  >
                    {t.name}
                    <button
                      type="button"
                      onClick={() => removeSelected(t.id)}
                      className="hover:text-[#0a5a4e] transition-colors ml-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Test catalog */}
          <div className="space-y-2">
            {filteredCatalog.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No tests match your search</p>
            ) : (
              filteredCatalog.map(({ category, tests }) => {
                const isOpen = !collapsed[category]
                const categoryTests: LabTest[] = tests.map((t) => ({ ...t, category }))
                const selectedInCategory = categoryTests.filter((t) => isSelected(t.id)).length

                return (
                  <div key={category} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(category)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">{category}</span>
                        {selectedInCategory > 0 && (
                          <span className="text-[10px] bg-[#0D6B5E] text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
                            {selectedInCategory}
                          </span>
                        )}
                      </div>
                      {isOpen ? (
                        <ChevronUp className="size-3.5 text-gray-400" />
                      ) : (
                        <ChevronDown className="size-3.5 text-gray-400" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="divide-y divide-gray-50">
                        {categoryTests.map((test) => {
                          const checked = isSelected(test.id)
                          return (
                            <label
                              key={test.id}
                              className={cn(
                                'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-sm',
                                checked ? 'bg-[#0D6B5E]/5' : 'hover:bg-gray-50'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTest(test)}
                                className="size-4 rounded border-gray-300 text-[#0D6B5E] accent-[#0D6B5E] shrink-0"
                              />
                              <span className={cn('font-medium', checked ? 'text-[#0D6B5E]' : 'text-gray-700')}>
                                {test.name}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Priority
            </Label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all',
                    priority === p.id
                      ? priorityColor[p.id]
                      : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                  )}
                >
                  <div>{p.label}</div>
                  <div className={cn('text-[10px] font-normal mt-0.5', priority === p.id ? 'opacity-80' : 'text-gray-400')}>
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Clinical notes */}
          <div className="space-y-1.5">
            <Label htmlFor="lab-notes" className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Clinical Notes (optional)
            </Label>
            <Textarea
              id="lab-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fasting required — patient last ate 8 hours ago"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 shrink-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || selected.length === 0}
            className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Ordering…
              </>
            ) : (
              <>
                <FlaskConical className="size-4" />
                Order {selected.length > 0 ? `${selected.length} Test${selected.length > 1 ? 's' : ''}` : 'Tests'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
