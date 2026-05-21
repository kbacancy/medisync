/**
 * Environment variable validation and typed access.
 * Throws at startup with a clear message if required vars are missing.
 * Import this module on the server side only where service keys are needed.
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `[MediSync] Missing required environment variable: ${key}\n` +
        `Add it to .env.local (local dev) or your deployment platform's env settings.`
    )
  }
  return value
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

// ─── Validated env export ─────────────────────────────────────────────────────
// Only call requireEnv for vars that are always needed.
// SUPABASE_SERVICE_ROLE_KEY and VAPID keys are server-only — they will be
// undefined on the client, which is intentional. Access them server-side only.

export const env = {
  // Public — available on both client and server
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  appUrl: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),

  // Server-only — undefined on the client (do not expose to browser)
  get supabaseServiceRoleKey(): string {
    return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  },
  get vapidPublicKey(): string {
    return optionalEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
  },
  get vapidPrivateKey(): string {
    return optionalEnv('VAPID_PRIVATE_KEY')
  },
  get vapidSubject(): string {
    return optionalEnv('VAPID_SUBJECT', 'mailto:admin@medisync.dev')
  },

  /** True when all push notification vars are configured */
  get pushEnabled(): boolean {
    return Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    )
  },

  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
}
