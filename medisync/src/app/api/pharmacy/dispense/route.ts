import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  patientId: z.string(),
  prescriptionId: z.string(),
  pharmacyName: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { patientId, prescriptionId, pharmacyName } = parsed.data;
  const supabase = await createClient();

  const { data: prescription, error: rxError } = await supabase
    .from('prescriptions')
    .select('days_supply')
    .eq('id', prescriptionId)
    .single();

  if (rxError || !prescription) {
    return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
  }

  const { days_supply } = prescription;

  const { data: newRecord, error } = await supabase
    .from('dispense_records')
    .insert({
      patient_id: patientId,
      prescription_id: prescriptionId,
      quantity_dispensed: days_supply,
      days_supply,
      remaining_count: days_supply,
      dispensed_at: new Date().toISOString(),
      pharmacy_name: pharmacyName ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: newRecord });
}
