import type { RiskLevel } from '@/types';

interface RiskBadgeProps {
  risk: RiskLevel;
  className?: string;
}

const RISK_STYLES: Record<RiskLevel, { bg: string; border: string; color: string }> = {
  CRITICAL: {
    bg: 'rgba(220,38,38,0.08)',
    border: 'rgba(220,38,38,0.2)',
    color: '#B91C1C',
  },
  HIGH: {
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.2)',
    color: '#92400E',
  },
  MODERATE: {
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    color: '#1D4ED8',
  },
  LOW: {
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    color: '#065F46',
  },
};

const RISK_LABELS: Record<RiskLevel, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MODERATE: 'Moderate',
  LOW: 'Low',
};

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  const s = RISK_STYLES[risk];
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.4,
        padding: '3px 8px',
        borderRadius: 100,
        border: `1px solid ${s.border}`,
        backgroundColor: s.bg,
        color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      {RISK_LABELS[risk]}
    </span>
  );
}
