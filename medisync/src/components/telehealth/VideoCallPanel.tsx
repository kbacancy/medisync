'use client'

import { useState, useEffect } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoCallPanelProps {
  patientName: string
  sessionDuration: number
}

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

export function VideoCallPanel({ patientName, sessionDuration }: VideoCallPanelProps) {
  const [elapsed, setElapsed] = useState(sessionDuration)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative rounded-xl overflow-hidden bg-[#1a2332] w-full" style={{ aspectRatio: '16/9' }}>
      {/* Patient video placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2332] via-[#1e2d42] to-[#0f1825] flex flex-col items-center justify-center">
        <div className="size-20 rounded-full bg-white/10 flex items-center justify-center mb-3">
          <span className="text-white/60 text-2xl font-bold">{getInitials(patientName)}</span>
        </div>
        <p className="text-white/40 text-sm">{patientName}</p>
      </div>

      {/* Live session indicator — top left */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
        <span className="size-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-white text-xs font-semibold tracking-wide">
          LIVE SESSION: {formatTime(elapsed)}
        </span>
      </div>

      {/* PiP doctor video — top right */}
      <div className="absolute top-4 right-4 w-28 h-20 rounded-lg overflow-hidden bg-gray-700 border-2 border-white/20 flex items-center justify-center">
        <span className="text-white/40 text-xs">You</span>
      </div>

      {/* Control bar — bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-4">
        {/* Mic */}
        <button
          onClick={() => setMicOn((v) => !v)}
          className={cn(
            'size-10 rounded-full flex items-center justify-center transition-colors',
            micOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-500/80 hover:bg-red-500'
          )}
        >
          {micOn ? (
            <Mic className="size-4 text-white" />
          ) : (
            <MicOff className="size-4 text-white" />
          )}
        </button>

        {/* Camera */}
        <button
          onClick={() => setCameraOn((v) => !v)}
          className={cn(
            'size-10 rounded-full flex items-center justify-center transition-colors',
            cameraOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-500/80 hover:bg-red-500'
          )}
        >
          {cameraOn ? (
            <Video className="size-4 text-white" />
          ) : (
            <VideoOff className="size-4 text-white" />
          )}
        </button>

        {/* End call — larger, red */}
        <button className="size-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg">
          <PhoneOff className="size-5 text-white" />
        </button>

        {/* Screen share */}
        <button className="size-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
          <Monitor className="size-4 text-white" />
        </button>

        {/* More */}
        <button className="size-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
          <MoreHorizontal className="size-4 text-white" />
        </button>
      </div>
    </div>
  )
}
