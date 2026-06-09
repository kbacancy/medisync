import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') ?? '',
      ].filter(Boolean),
    },
  },

  async headers() {
    const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
      .replace(/^https?:\/\//, '')

    // CSP: allow connections to Supabase (REST + Realtime WS) and Jitsi Meet
    const csp = [
      "default-src 'self'",
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://meet.jit.si wss://meet.jit.si`,
      "frame-src https://meet.jit.si",
      `img-src 'self' data: https://${supabaseHost}`,
      // Next.js requires 'unsafe-inline' for its runtime styles; scripts are
      // server-rendered so 'unsafe-inline' for scripts is avoided where possible
      "script-src 'self' 'unsafe-inline' https://meet.jit.si",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')

    const securityHeaders = [
      { key: 'Content-Security-Policy',        value: csp },
      { key: 'Strict-Transport-Security',       value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Frame-Options',                 value: 'DENY' },
      { key: 'X-Content-Type-Options',          value: 'nosniff' },
      { key: 'Referrer-Policy',                 value: 'strict-origin-when-cross-origin' },
      // Permit camera/mic for Jitsi telehealth; lock everything else down
      { key: 'Permissions-Policy',              value: 'camera=(self "https://meet.jit.si"), microphone=(self "https://meet.jit.si"), geolocation=(), interest-cohort=()' },
    ]

    return [
      {
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Allow the service worker to control the entire origin
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control',          value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
