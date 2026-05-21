import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';

interface RiskBadgeProps {
  risk: RiskLevel;
  className?: string;
}

const riskConfig: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(riskConfig[risk], 'font-medium', className)}
    >
      {risk}
    </Badge>
  );
}
