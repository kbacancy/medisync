'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PhoneOff, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoCallPanelProps {
  appointmentId: string
  patientName: string
  doctorName: string
  doctorId: string
  roomUrl: string
  roomName: string
  onCallEnded: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoCallPanel({
  appointmentId,
  patientName,
  doctorName,
  // doctorId / roomUrl unused — Jitsi derives everything from roomName
  roomName,
  onCallEnded,
}: VideoCallPanelProps) {
  const [loaded, setLoaded] = useState(false)
  const [isEndingCall, setIsEndingCall] = useState(false)
  const isEndingRef = useRef(false)

  // Suppress unused-var warnings — kept in props for API compatibility
  void patientName

  // Jitsi config passed as URL hash — no server API key needed
  const jitsiSrc =
    `https://meet.jit.si/${encodeURIComponent(roomName)}` +
    `#config.startWithVideoMuted=false` +
    `&config.startWithAudioMuted=false` +
    `&config.disableDeepLinking=true` +
    `&config.prejoinPageEnabled=false` +
    `&config.prejoinConfig.enabled=false` +
    `&userInfo.displayName=${encodeURIComponent(doctorName)}`

  const handleEndCall = useCallback(async () => {
    if (isEndingRef.current) return
    isEndingRef.current = true
    setIsEndingCall(true)
    await fetch('/api/telehealth/end-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId, roomName }),
    }).catch(console.error)
    onCallEnded()
  }, [appointmentId, roomName, onCallEnded])

  // Keep a stable ref so the postMessage listener always calls the latest version
  const handleEndCallRef = useRef(handleEndCall)
  handleEndCallRef.current = handleEndCall

  // Listen for Jitsi's postMessage — fires when the doctor clicks Jitsi's own hangup
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (typeof event.origin !== 'string' || !event.origin.includes('jit.si')) return
      const d = event.data
      const isHangup =
        d?.action === 'hangup' ||
        d?.action === 'videoConferenceLeft' ||
        d?.name === 'readyToClose'
      if (isHangup) handleEndCallRef.current()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-[#1a2332] w-full"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Direct Jitsi iframe — explicit allow ensures camera/mic on mobile */}
      <iframe
        src={jitsiSrc}
        allow="camera; microphone; fullscreen; display-capture; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
        onLoad={() => setLoaded(true)}
        title="Video call"
      />

      {/* Loading overlay — shown until iframe fires onLoad */}
      {!loaded && (
        <div className="absolute inset-0 bg-[#1a2332] flex flex-col items-center justify-center z-10">
          <Loader2 className="size-10 text-white/40 animate-spin mb-3" />
          <p className="text-white/50 text-sm">Loading video call…</p>
        </div>
      )}

      {/* End Call — always reachable; calling this also handles Jitsi's built-in hangup via postMessage */}
      {loaded && (
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={handleEndCall}
            disabled={isEndingCall}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg transition-colors"
            aria-label="End call"
          >
            {isEndingCall ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <PhoneOff className="size-3.5" />
            )}
            End Call
          </button>
        </div>
      )}
    </div>
  )
}
