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

export function PatientCallView({
  appointmentId,
  roomName,
  userId,
  userName,
}: PatientCallViewProps) {
  const router = useRouter()
  const [connected, setConnected] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null)

  // Stable ref so the readyToClose closure always has the latest router
  const routerRef = useRef(router)
  routerRef.current = router

  // Suppress unused warning — kept for future call analytics
  void appointmentId
  void userId

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
          userInfo: { displayName: userName },
          configOverwrite: {
            startWithVideoMuted: false,
            startWithAudioMuted: false,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: '#0f1825',
          },
        })
        apiRef.current = api

        api.addEventListener('videoConferenceJoined', () => {
          if (!cancelled) setConnected(true)
        })

        // When the patient clicks hangup or the room closes — navigate back
        api.addEventListener('readyToClose', () => {
          routerRef.current.push('/medications')
        })

        api.addEventListener('errorOccurred', (evt: { error?: { message?: string } }) => {
          if (!cancelled) {
            setErrorMsg(evt?.error?.message ?? 'Connection error')
          }
        })
      } catch (err) {
        if (!cancelled) {
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
  }, [roomName, userName])

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1825]">
      {/* Jitsi renders its full UI here */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Connecting overlay — removed once Jitsi fires videoConferenceJoined */}
      {!connected && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0f1825]">
          <Loader2 className="size-12 text-white/40 animate-spin mb-4" />
          <p className="text-white/60 text-base font-medium">Connecting to your doctor…</p>
          <p className="text-white/30 text-sm mt-2">Please wait</p>
        </div>
      )}

      {/* Error overlay */}
      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0f1825] px-6">
          <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <span className="text-red-400 text-3xl font-bold leading-none">!</span>
          </div>
          <p className="text-white/80 text-base font-semibold mb-2">Connection failed</p>
          <p className="text-white/40 text-sm mb-6 max-w-[240px] text-center leading-relaxed">
            {errorMsg}
          </p>
          <button
            onClick={() => router.push('/medications')}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Go Back
          </button>
        </div>
      )}
    </div>
  )
}
