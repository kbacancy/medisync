import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { calculatePDC } from '@/lib/pdc/calculator';

const schema = z.object({
  logId: z.string(),
  patientId: z.string(),
  prescriptionId: z.string().optional(),
  status: z.union([
    z.literal('taken'),
    z.literal('skipped'),
    z.literal('snoozed'),
    z.literal('missed'),
  ]),
  reason: z.string().optional(),
  snoozeUntil: z.string().optional(),
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

  const { logId, patientId, prescriptionId, status, reason, snoozeUntil } = parsed.data;
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    status,
    skip_reason: reason ?? null,
    snooze_until: snoozeUntil ?? null,
  };

  if (status === 'taken') {
    updateData.actual_time = new Date().toISOString();
  }

  const { data: updatedLog, error } = await supabase
    .from('adherence_logs')
    .update(updateData)
    .eq('id', logId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (status === 'taken' && prescriptionId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ data: takenLogs }, { data: rxData }] = await Promise.all([
      supabase
        .from('adherence_logs')
        .select('scheduled_time')
        .eq('patient_id', patientId)
        .eq('prescription_id', prescriptionId)
        .eq('status', 'taken')
        .gte('scheduled_time', thirtyDaysAgo.toISOString()),
      supabase
        .from('prescriptions')
        .select('start_date, days_supply')
        .eq('id', prescriptionId)
        .single(),
    ]);

    if (takenLogs && rxData) {
      const periodStart = new Date(rxData.start_date);
      const periodEnd = new Date();

      const score = calculatePDC({
        dispensingDates: takenLogs.map((l) => new Date(l.scheduled_time)),
        daysSupply: takenLogs.map(() => 1),
        periodStart,
        periodEnd,
      });

      await supabase.from('pdc_scores').upsert(
        {
          patient_id: patientId,
          prescription_id: prescriptionId,
          score,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          calculated_at: new Date().toISOString(),
        },
        { onConflict: 'patient_id,prescription_id' }
      );
    }
  }

  return NextResponse.json({ log: updatedLog });
}
