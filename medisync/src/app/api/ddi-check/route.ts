import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const schema = z.object({
  patientId: z.string(),
  newDrugName: z.string(),
  newDrugRxcui: z.string().optional(),
})

const SEED_INTERACTIONS = [
  {
    drug_a: 'Warfarin',
    drug_b: 'Aspirin',
    severity: 'severe',
    description:
      'Concurrent use significantly increases bleeding risk due to additive anticoagulant effects. Monitor INR closely and assess bleeding risk.',
  },
  {
    drug_a: 'Lisinopril',
    drug_b: 'Potassium',
    severity: 'moderate',
    description:
      'ACE inhibitors raise serum potassium. Concurrent potassium supplementation may cause hyperkalemia — monitor electrolytes.',
  },
  {
    drug_a: 'Metformin',
    drug_b: 'Alcohol',
    severity: 'moderate',
    description:
      'Alcohol potentiates metformin-induced lactic acidosis risk. Advise patients to avoid excessive alcohol consumption.',
  },
  {
    drug_a: 'Simvastatin',
    drug_b: 'Amiodarone',
    severity: 'severe',
    description:
      'Amiodarone inhibits CYP3A4, dramatically increasing simvastatin plasma levels and risk of myopathy or rhabdomyolysis.',
  },
  {
    drug_a: 'Sertraline',
    drug_b: 'Tramadol',
    severity: 'severe',
    description:
      'Risk of serotonin syndrome. Both agents increase serotonergic activity — combination may be life-threatening without monitoring.',
  },
  {
    drug_a: 'Metoprolol',
    drug_b: 'Verapamil',
    severity: 'severe',
    description:
      'Concurrent use causes severe bradycardia and AV heart block due to additive depression of cardiac conduction.',
  },
  {
    drug_a: 'Ciprofloxacin',
    drug_b: 'Tizanidine',
    severity: 'severe',
    description:
      'Ciprofloxacin inhibits CYP1A2, causing dramatic tizanidine level elevation with risk of severe hypotension and sedation.',
  },
]

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalize(name: string): string {
  return name.toLowerCase().trim()
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { patientId, newDrugName } = parsed.data
  const supabase = getServiceClient()

  const { data: activePrescriptions } = await supabase
    .from('prescriptions')
    .select('medication_name')
    .eq('patient_id', patientId)
    .eq('status', 'active')

  const existingDrugs = (activePrescriptions ?? []).map((p) =>
    normalize(p.medication_name)
  )
  const newDrugNorm = normalize(newDrugName)

  let { data: interactions } = await supabase
    .from('drug_interactions')
    .select('*')

  if (!interactions || interactions.length === 0) {
    await supabase.from('drug_interactions').insert(SEED_INTERACTIONS)
    interactions = SEED_INTERACTIONS.map((s, i) => ({ ...s, id: String(i + 1) }))
  }

  const allDrugs = [...existingDrugs, newDrugNorm]

  for (const interaction of interactions ?? []) {
    const a = normalize(interaction.drug_a)
    const b = normalize(interaction.drug_b)

    const aInList = allDrugs.some((d) => d.includes(a) || a.includes(d))
    const bInList = allDrugs.some((d) => d.includes(b) || b.includes(d))
    const newIsA = newDrugNorm.includes(a) || a.includes(newDrugNorm)
    const newIsB = newDrugNorm.includes(b) || b.includes(newDrugNorm)

    if (aInList && bInList && (newIsA || newIsB)) {
      if (interaction.severity === 'severe') {
        return NextResponse.json({
          hasSevereInteraction: true,
          drugA: interaction.drug_a,
          drugB: interaction.drug_b,
          severity: interaction.severity,
          description: interaction.description,
        })
      }
      if (interaction.severity === 'moderate') {
        return NextResponse.json({
          hasModerateInteraction: true,
          drugA: interaction.drug_a,
          drugB: interaction.drug_b,
          severity: interaction.severity,
          description: interaction.description,
        })
      }
    }
  }

  return NextResponse.json({ hasInteraction: false })
}
