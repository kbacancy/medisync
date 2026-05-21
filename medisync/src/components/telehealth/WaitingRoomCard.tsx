import { Video, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WaitingRoomCardProps {
  id: string
  name: string
  initials: string
  reason: string
  status: 'waiting' | 'in-call'
  waitMinutes?: number
  isActive: boolean
  onClick: () => void
  onStartCall?: () => void
  isStartingCall?: boolean
}

export function WaitingRoomCard({
  name,
  initials,
  reason,
  status,
  waitMinutes,
  isActive,
  onClick,
  onStartCall,
  isStartingCall = false,
}: WaitingRoomCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg transition-colors border-l-4 cursor-pointer select-none',
        isActive
          ? 'border-l-[#0D6B5E] bg-teal-50'
          : 'border-l-transparent hover:bg-gray-50'
      )}
    >
      {/* Avatar */}
      <div className="size-9 rounded-full bg-[#0D6B5E] flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-semibold">{initials}</span>
      </div>

      {/* Name + reason */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500 truncate">{reason}</p>
      </div>

      {/* Status + Start Call */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        {status === 'in-call' ? (
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded">
            IN CALL
          </span>
        ) : (
          <span className="text-xs text-gray-400 font-medium">{waitMinutes} MIN</span>
        )}

        {onStartCall && status !== 'in-call' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStartCall()
            }}
            disabled={isStartingCall}
            className="flex items-center gap-1 bg-[#0D6B5E] hover:bg-[#0a5a4e] disabled:opacity-60 text-white text-[10px] font-semibold px-2 py-1 rounded transition-colors whitespace-nowrap"
          >
            {isStartingCall ? (
              <Loader2 className="size-2.5 animate-spin" />
            ) : (
              <Video className="size-2.5" />
            )}
            {isStartingCall ? 'Starting…' : 'Start Call'}
          </button>
        )}
      </div>
    </div>
  )
}
