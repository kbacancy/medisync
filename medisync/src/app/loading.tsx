export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F6F8]">
      <div className="flex flex-col items-center gap-5">
        {/* Animated ring + logo */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse ring */}
          <span className="absolute inline-flex size-20 rounded-full bg-[#0D6B5E] opacity-20 animate-ping" />
          {/* Inner logo */}
          <div className="relative size-16 rounded-2xl bg-[#0D6B5E] flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-[#0D6B5E] tracking-wide">MediSync</p>
          <p className="text-xs text-gray-400">Loading…</p>
        </div>
      </div>
    </div>
  )
}
