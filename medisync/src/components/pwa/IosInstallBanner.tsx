'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'medisync-ios-install-dismissed'
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
  const [step, setStep] = useState<1 | 2 | 3>(1)

  useEffect(() => {
    if (!isIosSafari() || isInstalled()) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw && Date.now() - parseInt(raw, 10) < COOLDOWN_MS) return
    } catch { /* private browsing */ }
    const t = setTimeout(() => setShow(true), 900)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch { /* ignore */ }
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={dismiss} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Install MediSync"
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="size-5" />
        </button>

        <div className="px-5 pt-2 pb-2">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl shadow-sm shrink-0" />
            <div>
              <h2 className="text-[16px] font-bold text-gray-900 leading-tight">Install MediSync</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Get call alerts &amp; dose reminders when the app is installed
              </p>
            </div>
          </div>

          {/* Step tabs */}
          <div className="flex gap-1.5 mb-4">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                onClick={() => setStep(n)}
                className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                  step === n
                    ? 'bg-[#10b981] text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                Step {n}
              </button>
            ))}
          </div>

          {/* Step content */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-[14px] font-semibold text-gray-800">
                Tap the <span className="text-blue-600">Share</span> button in Safari
              </p>
              <p className="text-[12px] text-gray-500">
                It&apos;s the icon at the bottom-center of your screen — a box with an arrow pointing up.
              </p>

              {/* Safari toolbar mockup */}
              <div className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                {/* fake address bar */}
                <div className="bg-gray-200 px-3 py-2 flex items-center gap-2">
                  <div className="flex-1 bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                    <svg className="size-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                    <span className="text-[11px] text-gray-400 truncate">medisync.app</span>
                  </div>
                </div>
                {/* fake bottom toolbar */}
                <div className="bg-gray-50 px-2 py-3 flex items-center justify-around">
                  {/* Back */}
                  <svg className="size-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  {/* Forward */}
                  <svg className="size-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  {/* Share — highlighted */}
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-xl bg-blue-500/20 animate-pulse" />
                    <div className="relative bg-blue-500 rounded-xl p-2 shadow-md">
                      <svg className="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <polyline points="16 6 12 2 8 6"/>
                        <line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                    </div>
                    {/* tap here label */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                      Tap here
                    </div>
                  </div>
                  {/* Tabs */}
                  <svg className="size-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                  {/* More */}
                  <svg className="size-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-2xl bg-[#10b981] text-white font-semibold text-[14px] active:scale-[0.98] transition-transform"
              >
                I tapped Share →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-[14px] font-semibold text-gray-800">
                Tap <span className="text-blue-600">&quot;Add to Home Screen&quot;</span>
              </p>
              <p className="text-[12px] text-gray-500">
                In the share sheet that appeared, scroll down until you see this option and tap it.
              </p>

              {/* Share sheet mockup */}
              <div className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                {/* top row of share icons (decorative) */}
                <div className="px-3 pt-3 pb-2 flex gap-3 overflow-hidden">
                  {['Messages', 'Mail', 'Notes', 'More'].map((label) => (
                    <div key={label} className="flex flex-col items-center gap-1 shrink-0">
                      <div className="size-10 rounded-xl bg-gray-300" />
                      <span className="text-[9px] text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-gray-200 mx-3" />
                {/* list rows */}
                <div className="divide-y divide-gray-200">
                  {['Copy', 'Find on Page'].map((label) => (
                    <div key={label} className="px-4 py-3 flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-gray-300" />
                      <span className="text-[13px] text-gray-400">{label}</span>
                    </div>
                  ))}
                  {/* highlighted row */}
                  <div className="px-4 py-3 flex items-center gap-3 bg-blue-50 ring-1 ring-blue-300 ring-inset">
                    <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="size-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M12 8v8M8 12h8"/>
                      </svg>
                    </div>
                    <span className="text-[13px] font-semibold text-blue-700">Add to Home Screen</span>
                    <span className="ml-auto text-[11px] font-bold text-blue-500">← tap this</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-500 font-semibold text-[13px]"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-2xl bg-[#10b981] text-white font-semibold text-[14px] active:scale-[0.98] transition-transform"
                >
                  I see it →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-[14px] font-semibold text-gray-800">
                Tap <span className="text-blue-600">&quot;Add&quot;</span> to confirm
              </p>
              <p className="text-[12px] text-gray-500">
                A confirmation screen appears. Tap <strong>Add</strong> in the top-right corner.
              </p>

              {/* Confirmation screen mockup */}
              <div className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                {/* nav bar */}
                <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
                  <span className="text-[13px] text-blue-500">Cancel</span>
                  <span className="text-[13px] font-semibold text-gray-700">Add to Home Screen</span>
                  <span className="text-[13px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg ring-1 ring-blue-300">
                    Add ←
                  </span>
                </div>
                {/* app preview */}
                <div className="flex items-center gap-3 px-4 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/icon-192.png" alt="" width={52} height={52} className="rounded-2xl shadow-sm" />
                  <div>
                    <p className="text-[14px] font-semibold text-gray-800">MediSync</p>
                    <p className="text-[11px] text-gray-400">medisync.app</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-center text-gray-400">
                After tapping Add, open MediSync from your home screen — notifications will work automatically.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-500 font-semibold text-[13px]"
                >
                  ← Back
                </button>
                <button
                  onClick={dismiss}
                  className="flex-1 py-3 rounded-2xl bg-[#10b981] text-white font-semibold text-[14px] active:scale-[0.98] transition-transform"
                >
                  Done ✓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
