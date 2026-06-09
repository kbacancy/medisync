import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthResult =
  | { ok: true; userId: string; role: string; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }

/**
 * Verify the request carries a valid Supabase session.
 * Returns the authenticated user ID and their confirmed DB role,
 * or a 401/403 NextResponse ready to be returned from the route handler.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined
  if (!role) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { ok: true, userId: user.id, role, supabase: supabase as unknown as SupabaseClient }
}

/**
 * Require the caller to be an authenticated clinician.
 */
export async function requireClinician(): Promise<AuthResult> {
  const result = await requireAuth()
  if (!result.ok) return result

  if (result.role !== 'clinician' && result.role !== 'coordinator') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return result
}

/**
 * Require the caller to be an authenticated patient and return their patients.id.
 * Returns 403 if the user has no patient record.
 */
export async function requirePatient(): Promise<
  AuthResult & { ok: true; patientId: string } | { ok: false; response: NextResponse }
> {
  const result = await requireAuth()
  if (!result.ok) return result

  const supabase = await createClient()
  const { data: patientRecord } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', result.userId)
    .maybeSingle()

  if (!patientRecord?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ...result, patientId: patientRecord.id }
}
