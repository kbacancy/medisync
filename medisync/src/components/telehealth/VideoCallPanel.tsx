'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MoreHorizontal,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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

type CallState = 'connecting' | 'waiting' | 'live' | 'reconnecting' | 'error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0')
  const ss = (seconds % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function mergeTrack(
  el: HTMLVideoElement | null,
  track: MediaStreamTrack
): void {
  if (!el) return
  const existing = el.srcObject as MediaStream | null
  if (existing) {
    if (track.kind === 'video') {
      existing.getVideoTracks().forEach((t) => existing.removeTrack(t))
    } else {
      existing.getAudioTracks().forEach((t) => existing.removeTrack(t))
    }
    existing.addTrack(track)
  } else {
    el.srcObject = new MediaStream([track])
  }
  el.play().catch(() => {})
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoCallPanel({
  appointmentId,
  patientName,
  doctorName,
  doctorId,
  roomUrl,
  roomName,
  onCallEnded,
}: VideoCallPanelProps) {
  const [callState, setCallState] = useState<CallState>('connecting')
  const [elapsed, setElapsed] = useState(0)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isEndingCall, setIsEndingCall] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coRef = useRef<any>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Keep a stable ref for patientName so event closures don't go stale
  const patientNameRef = useRef(patientName)
  patientNameRef.current = patientName

  // ── Initialise Daily call ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        setCallState('connecting')

        // In mock/dev mode the room URL is a stub — skip the SDK entirely
        if (roomUrl.startsWith('https://mock.daily.co/')) {
          if (!cancelled) setCallState('waiting')
          return
        }

        // Server creates a signed token — keeps DAILY_API_KEY off the client
        const tokenRes = await fetch('/api/telehealth/get-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            userId: doctorId || 'doctor',
            userName: doctorName,
            isOwner: true,
          }),
        })
        if (!tokenRes.ok) throw new Error('Could not obtain meeting token')
        const { token } = await tokenRes.json()
        if (cancelled) return

        // Daily.co is browser-only; dynamic import avoids Next.js SSR issues
        const DailyIframe = (await import('@daily-co/daily-js')).default
        if (cancelled) return

        // Cast to any so event handler signatures aren't constrained to the SDK types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const co: any = DailyIframe.createCallObject()
        coRef.current = co

        // ── joined-meeting: we're in ────────────────────────────────────────
        co.on('joined-meeting', () => {
          if (cancelled) return
          setCallState('waiting')
          const local = co.participants()?.local
          const vid = local?.tracks?.video?.persistentTrack
          const aud = local?.tracks?.audio?.persistentTrack
          if (vid) mergeTrack(localVideoRef.current, vid)
          if (aud) mergeTrack(localVideoRef.current, aud)
        })

        // ── participant-joined: patient arrived ─────────────────────────────
        co.on('participant-joined', (evt: { participant: Record<string, unknown> }) => {
          if (cancelled) return
          const p = evt?.participant
          if (!p || p.local) return
          setCallState('live')
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
          }
          toast.success(`${patientNameRef.current} has joined the call`, {
            description: 'Video connection established',
          })
          const tracks = p.tracks as Record<string, { persistentTrack?: MediaStreamTrack }>
          const vid = tracks?.video?.persistentTrack
          const aud = tracks?.audio?.persistentTrack
          if (vid) mergeTrack(remoteVideoRef.current, vid)
          if (aud) mergeTrack(remoteVideoRef.current, aud)
        })

        // ── track-started: new / replaced track ────────────────────────────
        co.on(
          'track-started',
          (evt: { participant: Record<string, unknown>; track: MediaStreamTrack }) => {
            if (cancelled) return
            const { participant: p, track } = evt
            const el = p?.local ? localVideoRef.current : remoteVideoRef.current
            mergeTrack(el, track)
          }
        )

        // ── participant-updated: mute/unmute / track swap ───────────────────
        co.on('participant-updated', (evt: { participant: Record<string, unknown> }) => {
          if (cancelled) return
          const p = evt?.participant
          if (!p) return
          const tracks = p.tracks as Record<string, { persistentTrack?: MediaStreamTrack }>
          const vid = tracks?.video?.persistentTrack
          const aud = tracks?.audio?.persistentTrack
          const el = p.local ? localVideoRef.current : remoteVideoRef.current
          if (vid) mergeTrack(el, vid)
          if (aud) mergeTrack(el, aud)
        })

        // ── participant-left: patient hung up ───────────────────────────────
        co.on('participant-left', (evt: { participant: Record<string, unknown> }) => {
          if (cancelled) return
          if (evt?.participant?.local) return
          setCallState('waiting')
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
          toast.info(`${patientNameRef.current} has left the call`)
        })

        // ── network-quality / reconnection ─────────────────────────────────
        co.on('network-quality-change', (evt: { threshold: string }) => {
          if (cancelled) return
          if (evt?.threshold === 'very-low') {
            setCallState('reconnecting')
          } else if (callState === 'reconnecting') {
            setCallState('live')
          }
        })

        // ── error ───────────────────────────────────────────────────────────
        co.on('error', (evt: { errorMsg?: string }) => {
          if (cancelled) return
          setCallState('error')
          setErrorMsg(evt?.errorMsg ?? 'An unexpected error occurred during the call')
        })

        await co.join({ url: roomUrl, token })
      } catch (err) {
        if (cancelled) return
        setCallState('error')
        setErrorMsg(err instanceof Error ? err.message : 'Failed to connect to call')
      }
    }

    init()

    return () => {
      cancelled = true
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      coRef.current?.destroy()
      coRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, roomName, doctorId, doctorName, retryCount])

  // ── Controls ───────────────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    const co = coRef.current
    if (!co) return
    const next = !micOn
    co.setLocalAudio(next)
    setMicOn(next)
  }, [micOn])

  const toggleCamera = useCallback(() => {
    const co = coRef.current
    if (!co) return
    const next = !cameraOn
    co.setLocalVideo(next)
    setCameraOn(next)
  }, [cameraOn])

  const handleEndCall = useCallback(async () => {
    if (isEndingCall) return
    setIsEndingCall(true)
    try {
      await coRef.current?.leave()
    } catch {
      // ignore leave errors
    }
    await fetch('/api/telehealth/end-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId, roomName }),
    }).catch(console.error)
    onCallEnded()
  }, [appointmentId, roomName, onCallEnded, isEndingCall])

  const handleScreenShare = useCallback(async () => {
    const co = coRef.current
    if (!co) return
    try {
      const local = co.participants()?.local
      if (local?.screen) {
        await co.stopScreenShare()
      } else {
        await co.startScreenShare()
      }
    } catch {
      toast.error('Screen sharing is not available in this browser')
    }
  }, [])

  const handleRetry = useCallback(() => {
    coRef.current?.destroy()
    coRef.current = null
    setCallState('connecting')
    setErrorMsg(null)
    setElapsed(0)
    setRetryCount((c) => c + 1)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-[#1a2332] w-full"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Remote video — fills container; fades in when live */}
      <video
        ref={remoteVideoRef}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
          callState === 'live' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        autoPlay
        playsInline
      />

      {/* Overlay — shown when not live */}
      {callState !== 'live' && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2332] via-[#1e2d42] to-[#0f1825] flex flex-col items-center justify-center">
          {callState === 'connecting' && (
            <>
              <Loader2 className="size-10 text-white/40 animate-spin mb-3" />
              <p className="text-white/50 text-sm">Connecting to call…</p>
            </>
          )}

          {callState === 'waiting' && (
            <>
              <div className="relative size-20 mb-4">
                <div className="size-20 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-white/70 text-2xl font-bold">
                    {getInitials(patientName)}
                  </span>
                </div>
                <span className="absolute inset-0 rounded-full border-2 border-white/25 animate-ping" />
              </div>
              <p className="text-white/60 text-sm font-medium">
                Waiting for {patientName} to join…
              </p>
              <p className="text-white/30 text-xs mt-1.5">Push notification sent</p>
            </>
          )}

          {callState === 'reconnecting' && (
            <>
              <Loader2 className="size-10 text-amber-400/70 animate-spin mb-3" />
              <p className="text-white/50 text-sm">Reconnecting…</p>
            </>
          )}

          {callState === 'error' && (
            <>
              <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <span className="text-red-400 text-3xl font-bold leading-none">!</span>
              </div>
              <p className="text-white/80 text-sm font-semibold mb-1">Connection failed</p>
              <p className="text-white/40 text-xs mb-5 max-w-[200px] text-center leading-relaxed">
                {errorMsg}
              </p>
              <button
                onClick={handleRetry}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      )}

      {/* Live session indicator — top left */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 z-10">
        <span
          className={cn(
            'size-2 rounded-full',
            callState === 'live'
              ? 'bg-green-400 animate-pulse'
              : 'bg-gray-500'
          )}
        />
        <span className="text-white text-xs font-semibold tracking-wide">
          {callState === 'live'
            ? `LIVE SESSION: ${formatTime(elapsed)}`
            : callState === 'waiting'
              ? 'WAITING FOR PATIENT'
              : callState === 'reconnecting'
                ? 'RECONNECTING…'
                : 'CONNECTING…'}
        </span>
      </div>

      {/* PiP local video — top right (120×90 as per spec) */}
      <div className="absolute top-4 right-4 w-[120px] h-[90px] rounded-lg overflow-hidden bg-gray-800 border-2 border-white/20 z-10">
        <video
          ref={localVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        {!cameraOn && (
          <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
            <VideoOff className="size-4 text-white/40" />
          </div>
        )}
      </div>

      {/* Control bar — dark semi-transparent pill at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-4 z-10">
        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={cn(
            'size-10 rounded-full flex items-center justify-center transition-colors',
            micOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-500/80 hover:bg-red-500'
          )}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micOn ? (
            <Mic className="size-4 text-white" />
          ) : (
            <MicOff className="size-4 text-white" />
          )}
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          className={cn(
            'size-10 rounded-full flex items-center justify-center transition-colors',
            cameraOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-500/80 hover:bg-red-500'
          )}
          aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {cameraOn ? (
            <Video className="size-4 text-white" />
          ) : (
            <VideoOff className="size-4 text-white" />
          )}
        </button>

        {/* End call — larger red button */}
        <button
          onClick={handleEndCall}
          disabled={isEndingCall}
          className="size-12 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-60 flex items-center justify-center transition-colors shadow-lg"
          aria-label="End call"
        >
          {isEndingCall ? (
            <Loader2 className="size-5 text-white animate-spin" />
          ) : (
            <PhoneOff className="size-5 text-white" />
          )}
        </button>

        {/* Screen share */}
        <button
          onClick={handleScreenShare}
          className="size-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          aria-label="Share screen"
        >
          <Monitor className="size-4 text-white" />
        </button>

        {/* More options */}
        <button
          className="size-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="size-4 text-white" />
        </button>
      </div>
    </div>
  )
}
