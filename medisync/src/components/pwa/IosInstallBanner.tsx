'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'medisync-ios-install-dismissed'
/** Re-show after 7 days if the user tapped "Later" */
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      (navigator as { standalone?: boolean }).standalone === true)
  )
}

export function IosInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isIosSafari() || isInstalled()) return

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const elapsed = Date.now() - parseInt(raw, 10)
        if (elapsed < COOLDOWN_MS) return
      }
    } catch {
      // localStorage may be blocked in private-browsing edge cases
    }

    // Small delay so the page settles before the sheet slides in
    const t = setTimeout(() => setShow(true), 900)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch { /* ignore */ }
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      {/* Backdrop — tapping outside dismisses */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Install MediSync"
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Dismiss X */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 active:scale-90 transition-transform"
          aria-label="Dismiss"
        >
          <X className="size-5" />
        </button>

        <div className="px-6 pt-2">
          {/* App icon + heading */}
          <div className="flex flex-col items-center text-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="MediSync"
              width={64}
              height={64}
              className="rounded-2xl shadow-md mb-3"
            />
            <h2 className="text-[17px] font-bold text-gray-900 leading-tight">
              Add MediSync to Your Home Screen
            </h2>
            <p className="text-[13px] text-gray-500 mt-1.5 max-w-[280px] leading-relaxed">
              Install the app to receive <strong className="text-gray-700">incoming call alerts</strong> and{' '}
              <strong className="text-gray-700">dose reminders</strong> even when your browser is closed.
            </p>
            {/* iOS Safari has no one-tap install button — make the manual requirement explicit */}
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 max-w-[280px]">
              Safari on iPhone has no &quot;Install&quot; button — follow the 3 steps below.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            <InstallStep number={1}>
              Tap the{' '}
              {/* Inline SVG matching the actual iOS Safari share button */}
              <span className="inline-flex items-center justify-center size-5 rounded bg-blue-500 align-middle mx-0.5">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>{' '}
              <strong>Share</strong> button at the bottom of Safari
            </InstallStep>

            <InstallStep number={2}>
              Scroll down and tap{' '}
              <span className="inline-flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-0.5 text-[12px] font-medium text-gray-700 align-middle">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                Add to Home Screen
              </span>
            </InstallStep>

            <InstallStep number={3}>
              Tap{' '}
              <span className="font-bold text-blue-500">Add</span>{' '}
              in the top-right corner to confirm
            </InstallStep>
          </div>

          {/* Animated pointer towards Safari toolbar */}
          <div className="flex flex-col items-center gap-1 mb-6 text-blue-500">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              Share button is in the toolbar below
            </span>
            <svg
              className="animate-bounce"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>

          {/* CTA */}
          <button
            onClick={dismiss}
            className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-500 font-semibold text-[15px] active:scale-[0.98] transition-transform"
          >
            Later
          </button>
        </div>
      </div>
    </>
  )
}

function InstallStep({
  number,
  children,
}: {
  number: number
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="size-[22px] rounded-full bg-[#10b981] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
        {number}
      </span>
      <p className="text-[13px] text-gray-700 leading-relaxed">{children}</p>
    </div>
  )
}
