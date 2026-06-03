'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface PatientCallViewProps {
  appointmentId: string
  roomUrl: string
  roomName: string
  userId: string
  userName: string
}

type CallState = 'connecting' | 'live' | 'reconnecting' | 'error'

type DailyParticipant = {
  local?: boolean
  tracks?: {
    video?: { persistentTrack?: MediaStreamTrack }
    audio?: { persistentTrack?: MediaStreamTrack }
  }
}

function mergeTrack(el: HTMLVideoElement | null, track: MediaStreamTrack): void {
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

export function PatientCallView({
  appointmentId,
  roomUrl,
  roomName,
  userId,
  userName,
}: PatientCallViewProps) {
  const router = useRouter()
  const [callState, setCallState] = useState<CallState>('connecting')
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coRef = useRef<any>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        setCallState('connecting')

        if (roomUrl.startsWith('https://mock.daily.co/')) {
          if (!cancelled) setCallState('live')
          return
        }

        const tokenRes = await fetch('/api/telehealth/get-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName, userId, userName, isOwner: false }),
        })
        if (!tokenRes.ok) throw new Error('Could not obtain meeting token')
        const { token } = await tokenRes.json()
        if (cancelled) return

        const DailyIframe = (await import('@daily-co/daily-js')).default
        if (cancelled) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const co: any = DailyIframe.createCallObject()
        coRef.current = co

        co.on('joined-meeting', () => {
          if (cancelled) return
          setCallState('live')
          const all = (co.participants() ?? {}) as Record<string, DailyParticipant>
          const local = all.local
          const vid = local?.tracks?.video?.persistentTrack
          const aud = local?.tracks?.audio?.persistentTrack
          if (vid) mergeTrack(localVideoRef.current, vid)
          if (aud) mergeTrack(localVideoRef.current, aud)
          const remote = Object.values(all).find((p) => !p.local)
          if (remote) {
            const rVid = remote.tracks?.video?.persistentTrack
            const rAud = remote.tracks?.audio?.persistentTrack
            if (rVid) mergeTrack(remoteVideoRef.current, rVid)
            if (rAud) mergeTrack(remoteVideoRef.current, rAud)
          }
        })

        co.on('participant-joined', (evt: { participant: DailyParticipant }) => {
          if (cancelled) return
          const p = evt?.participant
          if (!p || p.local) return
          const vid = p.tracks?.video?.persistentTrack
          const aud = p.tracks?.audio?.persistentTrack
          if (vid) mergeTrack(remoteVideoRef.current, vid)
          if (aud) mergeTrack(remoteVideoRef.current, aud)
        })

        co.on(
          'track-started',
          (evt: { participant: DailyParticipant; track: MediaStreamTrack }) => {
            if (cancelled) return
            const { participant: p, track } = evt
            const el = p?.local ? localVideoRef.current : remoteVideoRef.current
            mergeTrack(el, track)
          }
        )

        co.on('participant-updated', (evt: { participant: DailyParticipant }) => {
          if (cancelled) return
          const p = evt?.participant
          if (!p) return
          const vid = p.tracks?.video?.persistentTrack
          const aud = p.tracks?.audio?.persistentTrack
          const el = p.local ? localVideoRef.current : remoteVideoRef.current
          if (vid) mergeTrack(el, vid)
          if (aud) mergeTrack(el, aud)
        })

        co.on('participant-left', (evt: { participant: DailyParticipant }) => {
          if (cancelled) return
          if (evt?.participant?.local) return
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
          toast.info('Your doctor has left the call')
        })

        co.on('network-quality-change', (evt: { threshold: string }) => {
          if (cancelled) return
          if (evt?.threshold === 'very-low') {
            setCallState('reconnecting')
          } else if (callState === 'reconnecting') {
            setCallState('live')
          }
        })

        co.on('error', (evt: { errorMsg?: string }) => {
          if (cancelled) return
          setCallState('error')
          setErrorMsg(evt?.errorMsg ?? 'An unexpected error occurred')
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
      coRef.current?.destroy()
      coRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, roomName, userId, userName, retryCount])

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

  const handleLeave = useCallback(async () => {
    if (isLeaving) return
    setIsLeaving(true)
    try {
      await coRef.current?.leave()
    } catch {
      // ignore leave errors
    }
    router.push('/medications')
  }, [isLeaving, router])

  const handleRetry = useCallback(() => {
    coRef.current?.destroy()
    coRef.current = null
    setCallState('connecting')
    setErrorMsg(null)
    setRetryCount((c) => c + 1)
  }, [])

  // Suppress unused warning — appointmentId kept for future call-end signalling
  void appointmentId

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1825] flex flex-col">
      {/* Remote video — fills screen */}
      <video
        ref={remoteVideoRef}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
          callState === 'live' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        autoPlay
        playsInline
      />

      {/* Connecting / error overlay */}
      {callState !== 'live' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          {(callState === 'connecting' || callState === 'reconnecting') && (
            <>
              <Loader2
                className={cn(
                  'size-12 mb-4 animate-spin',
                  callState === 'reconnecting' ? 'text-amber-400/70' : 'text-white/40'
                )}
              />
              <p className="text-white/60 text-base font-medium">
                {callState === 'reconnecting'
                  ? 'Reconnecting…'
                  : 'Connecting to your doctor…'}
              </p>
              {callState === 'connecting' && (
                <p className="text-white/30 text-sm mt-2">Please wait</p>
              )}
            </>
          )}

          {callState === 'error' && (
            <>
              <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <span className="text-red-400 text-3xl font-bold leading-none">!</span>
              </div>
              <p className="text-white/80 text-base font-semibold mb-2">Connection failed</p>
              <p className="text-white/40 text-sm mb-6 max-w-[240px] text-center leading-relaxed">
                {errorMsg}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/medications')}
                  className="px-6 py-2.5 bg-transparent border border-white/20 hover:border-white/40 text-white/60 text-sm font-medium rounded-xl transition-colors"
                >
                  Go Back
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* PiP local video — top right, respects notch */}
      <div
        className="absolute right-4 w-[96px] h-[128px] rounded-xl overflow-hidden bg-gray-800 border-2 border-white/20 z-10"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
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

      {/* Status pill — top left */}
      <div
        className="absolute left-4 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <span
          className={cn(
            'size-2 rounded-full',
            callState === 'live'
              ? 'bg-green-400 animate-pulse'
              : callState === 'reconnecting'
                ? 'bg-amber-400'
                : 'bg-gray-500'
          )}
        />
        <span className="text-white text-xs font-semibold tracking-wide">
          {callState === 'live'
            ? 'CONNECTED'
            : callState === 'reconnecting'
              ? 'RECONNECTING…'
              : 'CONNECTING…'}
        </span>
      </div>

      {/* Control bar — pinned above home indicator */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-6 z-10"
        style={{
          height: 'calc(80px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <button
          onClick={toggleMic}
          className={cn(
            'size-12 rounded-full flex items-center justify-center transition-colors',
            micOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-500/80 hover:bg-red-500'
          )}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micOn ? (
            <Mic className="size-5 text-white" />
          ) : (
            <MicOff className="size-5 text-white" />
          )}
        </button>

        <button
          onClick={toggleCamera}
          className={cn(
            'size-12 rounded-full flex items-center justify-center transition-colors',
            cameraOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-500/80 hover:bg-red-500'
          )}
          aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {cameraOn ? (
            <Video className="size-5 text-white" />
          ) : (
            <VideoOff className="size-5 text-white" />
          )}
        </button>

        <button
          onClick={handleLeave}
          disabled={isLeaving}
          className="size-14 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-60 flex items-center justify-center transition-colors shadow-lg"
          aria-label="Leave call"
        >
          {isLeaving ? (
            <Loader2 className="size-6 text-white animate-spin" />
          ) : (
            <PhoneOff className="size-6 text-white" />
          )}
        </button>
      </div>
    </div>
  )
}
