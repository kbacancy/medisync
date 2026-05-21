'use client'

import { useEffect, useState } from 'react'

interface PDCRingProps {
  pdc: number
  size?: number
  strokeWidth?: number
}

export function PDCRing({ pdc, size = 160, strokeWidth = 14 }: PDCRingProps) {
  const [animated, setAnimated] = useState(0)
  const center = size / 2
  const radius = center - strokeWidth / 2 - 4
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const id = setTimeout(() => setAnimated(pdc), 150)
    return () => clearTimeout(id)
  }, [pdc])

  const offset = circumference - (animated / 100) * circumference
  const color = pdc >= 80 ? '#0D6B5E' : pdc >= 60 ? '#f59e0b' : '#ef4444'
  const label = pdc >= 80 ? 'Good' : pdc >= 60 ? 'Fair' : 'Poor'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`PDC score ${pdc}%`}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{
          transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease',
        }}
      />
      <text
        x={center}
        y={center - 10}
        textAnchor="middle"
        fontSize={Math.round(size * 0.175)}
        fontWeight="700"
        fill={color}
        dominantBaseline="middle"
      >
        {pdc}%
      </text>
      <text
        x={center}
        y={center + 14}
        textAnchor="middle"
        fontSize={Math.round(size * 0.075)}
        fill="#6b7280"
      >
        PDC
      </text>
      <text
        x={center}
        y={center + 26}
        textAnchor="middle"
        fontSize={Math.round(size * 0.065)}
        fill={color}
        fontWeight="600"
      >
        {label}
      </text>
    </svg>
  )
}
