'use client'

import { useRouter } from 'next/navigation'
import { Video } from 'lucide-react'

interface ActiveCallBannerProps {
  appointmentId: string
  roomUrl: string
  roomName: string
  doctorName: string
}

export function ActiveCallBanner({
  appointmentId,
  roomUrl,
  roomName,
  doctorName,
}: ActiveCallBannerProps) {
  const router = useRouter()

  function joinCall() {
    const params = new URLSearchParams({
      appointmentId,
      roomUrl: encodeURIComponent(roomUrl),
      roomName,
    })
    router.push(`/call?${params.toString()}`)
  }

  return (
    <div
      className="fixed left-0 right-0 z-[60] px-4"
      style={{ bottom: 'calc(57px + env(safe-area-inset-bottom))' }}
    >
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 shadow-xl overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3.5">
        {/* Pulsing icon */}
        <div className="relative shrink-0">
          <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
            <Video className="size-5 text-white" />
          </div>
          <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">
            Dr. {doctorName.replace(/^Dr\.?\s+/i, '')} is ready
          </p>
          <p className="text-white/75 text-xs mt-0.5">
            Your video consultation is waiting
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={joinCall}
          className="shrink-0 bg-white text-blue-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/90 active:scale-95 transition-all"
        >
          Join Now
        </button>
      </div>
      </div>
    </div>
  )
}
