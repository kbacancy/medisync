'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PatientCallViewProps {
  appointmentId: string
  roomUrl: string
  roomName: string
  userId: string
  userName: string
}

export function PatientCallView({
  appointmentId,
  roomName,
  userName,
}: PatientCallViewProps) {
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const routerRef = useRef(router)
  routerRef.current = router

  // Suppress unused-var warnings
  void appointmentId

  // Listen for Jitsi's postMessage — fires when the patient clicks hangup inside the iframe
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (typeof event.origin !== 'string' || !event.origin.includes('jit.si')) return
      const d = event.data
      const isHangup =
        d?.action === 'hangup' ||
        d?.action === 'videoConferenceLeft' ||
        d?.name === 'readyToClose'
      if (isHangup) routerRef.current.push('/medications')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Jitsi config via URL hash — no API key required
  const jitsiSrc =
    `https://meet.jit.si/${encodeURIComponent(roomName)}` +
    `#config.startWithVideoMuted=false` +
    `&config.startWithAudioMuted=false` +
    `&config.disableDeepLinking=true` +
    `&config.prejoinPageEnabled=false` +
    `&config.prejoinConfig.enabled=false` +
    `&userInfo.displayName=${encodeURIComponent(userName)}`

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1825]">
      {/* Direct iframe — explicit allow is critical for camera/mic on mobile browsers */}
      <iframe
        src={jitsiSrc}
        allow="camera; microphone; fullscreen; display-capture; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
        onLoad={() => setLoaded(true)}
        title="Video call"
      />

      {/* Connecting overlay — disappears once iframe loads */}
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0f1825]">
          <Loader2 className="size-12 text-white/40 animate-spin mb-4" />
          <p className="text-white/60 text-base font-medium">Connecting to your doctor…</p>
          <p className="text-white/30 text-sm mt-2">Please wait</p>
        </div>
      )}

      {/* Fallback leave button — visible after iframe loads, in case Jitsi's postMessage doesn't fire */}
      {loaded && (
        <button
          onClick={() => router.push('/medications')}
          className="absolute z-20 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white/70 text-xs font-medium px-4 py-2 rounded-full border border-white/15 transition-colors"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          ← Back to Medications
        </button>
      )}
    </div>
  )
}
