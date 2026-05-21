import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const schema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  phone: z.string().optional(),
})

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateTempPassword(): string {
  return `Tmp${Math.random().toString(36).slice(2, 10)}@1`
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
    return NextResponse.json(
      { error: 'Invalid request body', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { fullName, email, dateOfBirth, gender, bloodType, phone } = parsed.data
  const supabase = getServiceClient()

  // 1. Create the auth user — handle_new_user trigger creates the profile automatically
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: generateTempPassword(),
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'patient',
    },
  })

  let userId: string
  let createdAuthUser = false

  if (authError) {
    if (!authError.message.toLowerCase().includes('already')) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Auth account exists — look up the user and link them instead of failing
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      return NextResponse.json({ error: 'Failed to look up existing user' }, { status: 500 })
    }
    const existing = listData.users.find((u) => u.email === email)
    if (!existing) {
      return NextResponse.json({ error: 'User lookup failed' }, { status: 500 })
    }
    userId = existing.id

    // Ensure a profiles row exists with the correct name.
    // Upsert has an ON CONFLICT gap when the profile already exists with empty
    // full_name (WHERE NOT EXISTS guard skips the INSERT entirely, so ON CONFLICT
    // never fires). Use explicit update → insert instead.
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) {
      // Always sync the name the doctor entered so it appears correctly in the list
      await supabase
        .from('profiles')
        .update({ full_name: fullName, role: 'patient' })
        .eq('id', userId)
    } else {
      await supabase
        .from('profiles')
        .insert({ id: userId, email, full_name: fullName, role: 'patient' })
    }

    // If a patients record already exists, bust the page cache so the newly
    // repaired profile name shows immediately, then return 409.
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle()

    if (existingPatient) {
      revalidatePath('/patients')
      return NextResponse.json(
        { error: 'This patient is already in your roster' },
        { status: 409 }
      )
    }
  } else {
    userId = authData.user.id
    createdAuthUser = true
  }

  // 2. Update phone on the profile if provided (trigger may not set it)
  if (phone) {
    await supabase.from('profiles').update({ phone }).eq('id', userId)
  }

  // 3. Create the patient clinical record
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .insert({
      profile_id: userId,
      date_of_birth: dateOfBirth || null,
      gender: gender || '',
      blood_type: bloodType || null,
      risk_level: 'LOW',
    })
    .select('id')
    .single()

  if (patientError) {
    // Only clean up the auth user if we just created it — never delete a pre-existing account
    if (createdAuthUser) {
      await supabase.auth.admin.deleteUser(userId)
    }
    return NextResponse.json({ error: 'Failed to create patient record' }, { status: 500 })
  }

  revalidatePath('/patients')
  return NextResponse.json({ success: true, patientId: patient.id })
}
