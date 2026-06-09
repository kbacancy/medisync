import { type LucideIcon } from 'lucide-react';
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

export function StatCard({ title, value, icon: Icon, accentColor, trend, className }: StatCardProps) {
  return (
    <div
      className={cn('bg-white rounded-xl p-4', className)}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Label → Metric → Trend (stacked) */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--ms-text-secondary)', marginBottom: 4 }}>
            {title}
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: 'var(--ms-text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {value}
          </p>
          {trend && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                marginTop: 8,
                fontSize: 12,
                fontWeight: 500,
                color: trend.direction === 'up' ? '#10B981' : '#EF4444',
              }}
            >
              <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
              <span>{trend.percentage}% vs last month</span>
            </div>
          )}
        </div>

        {/* Tinted icon circle — 36px, 10% opacity bg */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: `${accentColor}1A`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 20, height: 20, color: accentColor }} />
        </div>
      </div>
    </div>
  );
}
