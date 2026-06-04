import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  // Refresh session — do not remove, required to keep auth tokens fresh
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/register')
  const isPublicRoute = pathname === '/'

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Single profile lookup covers all role-based routing decisions below.
  // Only execute when the user is authenticated and on a role-gated path.
  const clinicianPaths = ['/dashboard', '/patients', '/schedule', '/telehealth', '/settings']
  const patientPaths   = ['/medications', '/adherence', '/profile']
  const isClinicianPath = clinicianPaths.some(p => pathname.startsWith(p))
  const isPatientPath   = patientPaths.some(p => pathname.startsWith(p))

  if (user && (isAuthRoute || isClinicianPath || isPatientPath)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'patient'
    const url = request.nextUrl.clone()

    // Authenticated user visiting a login/register page → send home
    if (isAuthRoute) {
      url.pathname = role === 'patient' ? '/medications' : '/dashboard'
      return NextResponse.redirect(url)
    }

    // Patient trying to reach a clinician-only path
    if (isClinicianPath && role === 'patient') {
      url.pathname = '/medications'
      return NextResponse.redirect(url)
    }

    // Clinician/coordinator trying to reach a patient-only path
    if (isPatientPath && (role === 'clinician' || role === 'coordinator')) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
