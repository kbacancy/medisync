import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VERSION = '1.0.0'

export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp,
          version: VERSION,
          services: {
            database: 'disconnected',
            auth: 'ok',
          },
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return NextResponse.json(
      {
        status: 'ok',
        timestamp,
        version: VERSION,
        services: {
          database: 'connected',
          auth: 'ok',
        },
      },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        timestamp,
        version: VERSION,
        services: {
          database: 'disconnected',
          auth: 'unknown',
        },
      },
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
