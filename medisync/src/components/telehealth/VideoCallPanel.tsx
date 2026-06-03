'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PhoneOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

type CallState = 'connecting' | 'waiting' | 'live' | 'error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

async function loadJitsiScript(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).JitsiMeetExternalAPI) return
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Jitsi'))
    document.head.appendChild(script)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoCallPanel({
  appointmentId,
  patientName,
  doctorName,
  // doctorId and roomUrl are unused with Jitsi (no token or API call needed)
  roomName,
  onCallEnded,
}: VideoCallPanelProps) {
  const [callState, setCallState] = useState<CallState>('connecting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isEndingCall, setIsEndingCall] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null)
  const isEndingRef = useRef(false)

  const handleEndCall = useCallback(async () => {
    if (isEndingRef.current) return
    isEndingRef.current = true
    setIsEndingCall(true)
    try {
      apiRef.current?.executeCommand('hangup')
    } catch { /* ignore */ }
    await fetch('/api/telehealth/end-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId, roomName }),
    }).catch(console.error)
    onCallEnded()
  }, [appointmentId, roomName, onCallEnded])

  // Keep a stable ref so the Jitsi event listener always sees the latest version
  const handleEndCallRef = useRef(handleEndCall)
  handleEndCallRef.current = handleEndCall

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        await loadJitsiScript()
        if (cancelled || !containerRef.current) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const JitsiAPI = (window as any).JitsiMeetExternalAPI
        const api = new JitsiAPI('meet.jit.si', {
          roomName,
          parentNode: containerRef.current,
          userInfo: { displayName: doctorName },
          configOverwrite: {
            startWithVideoMuted: false,
            startWithAudioMuted: false,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: '#1a2332',
          },
        })
        apiRef.current = api

        api.addEventListener('videoConferenceJoined', () => {
          if (!cancelled) setCallState('waiting')
        })
        api.addEventListener('participantJoined', () => {
          if (!cancelled) setCallState('live')
        })
        api.addEventListener('participantLeft', () => {
          if (!cancelled) setCallState('waiting')
        })
        api.addEventListener('readyToClose', () => {
          handleEndCallRef.current()
        })
        api.addEventListener('errorOccurred', (evt: { error?: { message?: string } }) => {
          if (!cancelled) {
            setCallState('error')
            setErrorMsg(evt?.error?.message ?? 'An error occurred during the call')
          }
        })
      } catch (err) {
        if (!cancelled) {
          setCallState('error')
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load video call')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      apiRef.current?.dispose()
      apiRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, doctorName])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-[#1a2332] w-full"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Jitsi renders its full UI into this div */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Connecting — shown until Jitsi is ready */}
      {callState === 'connecting' && (
        <div className="absolute inset-0 bg-[#1a2332] flex flex-col items-center justify-center z-10">
          <Loader2 className="size-10 text-white/40 animate-spin mb-3" />
          <p className="text-white/50 text-sm">Connecting to call…</p>
        </div>
      )}

      {/* Waiting — semi-transparent so Jitsi controls still work underneath */}
      {callState === 'waiting' && (
        <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="relative size-16 mb-3">
            <div className="size-16 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-white/70 text-xl font-bold">
                {getInitials(patientName)}
              </span>
            </div>
            <span className="absolute inset-0 rounded-full border-2 border-white/25 animate-ping" />
          </div>
          <p className="text-white/60 text-sm font-medium">
            Waiting for {patientName} to join…
          </p>
          <p className="text-white/30 text-xs mt-1.5">Push notification sent</p>
        </div>
      )}

      {/* Error */}
      {callState === 'error' && (
        <div className="absolute inset-0 bg-[#1a2332] flex flex-col items-center justify-center z-10">
          <div className="size-14 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
            <span className="text-red-400 text-2xl font-bold leading-none">!</span>
          </div>
          <p className="text-white/80 text-sm font-semibold mb-1">Connection failed</p>
          <p className="text-white/40 text-xs max-w-[220px] text-center leading-relaxed">
            {errorMsg}
          </p>
        </div>
      )}

      {/* End Call button — always reachable, sits above Jitsi toolbar */}
      {(callState === 'waiting' || callState === 'live') && (
        <div className={cn('absolute top-3 right-3 z-20', callState === 'waiting' ? 'pointer-events-auto' : '')}>
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
