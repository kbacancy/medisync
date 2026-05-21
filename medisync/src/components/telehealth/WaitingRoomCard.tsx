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
}

export function WaitingRoomCard({
  name,
  initials,
  reason,
  status,
  waitMinutes,
  isActive,
  onClick,
}: WaitingRoomCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg transition-colors border-l-4',
        isActive
          ? 'border-l-[#0D6B5E] bg-teal-50'
          : 'border-l-transparent hover:bg-gray-50'
      )}
    >
      <div className="size-9 rounded-full bg-[#0D6B5E] flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-semibold">{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500 truncate">{reason}</p>
      </div>

      <div className="shrink-0">
        {status === 'in-call' ? (
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded">
            IN CALL
          </span>
        ) : (
          <span className="text-xs text-gray-400 font-medium">
            {waitMinutes} MIN
          </span>
        )}
      </div>
    </button>
  )
}
