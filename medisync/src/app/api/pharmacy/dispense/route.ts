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

  const { data: newRecord, error } = await supabase
    .from('dispense_records')
    .insert({
      patient_id: patientId,
      prescription_id: prescriptionId,
      quantity_dispensed: 30,
      days_supply: 30,
      remaining_count: 30,
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
