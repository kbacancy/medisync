import { ArrowUp, ArrowDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accentColor: string;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  accentColor,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn('bg-white rounded-xl p-5 flex items-center gap-4', className)}
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderLeft: `2px solid ${accentColor}`,
      }}
    >
      {/* Tinted icon circle */}
      <div
        className="size-12 shrink-0 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${accentColor}18` }}
      >
        <Icon className="size-5" style={{ color: accentColor }} />
      </div>

      {/* Value + label */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-medium truncate"
          style={{ color: 'var(--ms-text-secondary)' }}
        >
          {title}
        </p>
        <p
          className="text-[28px] font-semibold leading-tight"
          style={{
            color: 'var(--ms-text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </p>
        {trend && (
          <div
            className="flex items-center gap-1 mt-0.5 text-[12px] font-medium"
            style={{
              color: trend.direction === 'up' ? 'var(--ms-ok)' : 'var(--ms-critical)',
            }}
          >
            {trend.direction === 'up' ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
            <span>{trend.percentage}% vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
