import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const supabase = getServiceClient()

  const { data: profileMatches } = await supabase
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', `%${q}%`)
    .eq('role', 'patient')
    .limit(10)

  if (!profileMatches?.length) return NextResponse.json([])

  const profileIds = profileMatches.map((p) => p.id)

  const { data: patientRecords } = await supabase
    .from('patients')
    .select('id, profile_id')
    .in('profile_id', profileIds)

  const patientMap = new Map(
    (patientRecords ?? []).map((p) => [p.profile_id, p.id])
  )

  const results = profileMatches
    .filter((p) => patientMap.has(p.id))
    .map((p) => ({
      patientId: patientMap.get(p.id)!,
      profileId: p.id,
      name: p.full_name as string,
      initials: getInitials(p.full_name as string),
    }))

  return NextResponse.json(results)
}
