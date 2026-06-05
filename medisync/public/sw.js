/**
 * MediSync Service Worker
 *
 * Strategies:
 *  - /_next/static/**  → cache-first  (hashed filenames never change)
 *  - /api/**           → network-only (always fresh; returns 503 JSON when offline)
 *  - everything else   → network-first with cache fallback (pages, fonts, icons)
 *
 * Push notifications: handled here so they fire even when the app tab is closed.
 */

const CACHE_VERSION = 'medisync-v2'

// In development, Turbopack serves /_next/static/ chunks without content hashes,
// so cache-first would serve stale bundles after source changes.
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.svg',
]

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  )
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting()
})

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  )
  // Take control of all open tabs without a reload
  self.clients.claim()
})

// ─── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only intercept same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API routes: network-only, return structured offline response on failure
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline', status: 503 }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // Next.js static assets: cache-first (filenames include content hash in prod).
  // Skip entirely in dev — unhashed Turbopack chunks must never be served stale.
  if (url.pathname.startsWith('/_next/static/')) {
    if (!isDev) {
      event.respondWith(
        caches.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) {
                const clone = response.clone()
                caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone))
              }
              return response
            })
        )
      )
    }
    return
  }

  // Pages and other assets: network-first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// ─── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'MediSync', body: event.data.text() }
  }

  const title = payload.title || 'MediSync'
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'medisync-default',
    data: { url: payload.url || '/' },
    // Keeps the notification grouped on Android
    renotify: !!payload.tag,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const relativePath = event.notification.data?.url || '/'
  // Always use an absolute URL — clients.openWindow requires it on some browsers,
  // and c.url (which is always absolute) must be compared to an absolute URL.
  const absoluteUrl = self.location.origin + relativePath

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Re-focus an existing tab if one is already open at that URL.
        // Compare absolute-to-absolute so the check actually matches.
        const existing = clientList.find(
          (c) => c.url === absoluteUrl && 'focus' in c
        )
        if (existing) {
          return existing.focus()
        }
        // On iOS Safari (standalone PWA) matchAll returns an empty list,
        // so we always fall through to openWindow — this navigates the
        // existing app window rather than opening a second one.
        return clients.openWindow(absoluteUrl)
      })
  )
})
