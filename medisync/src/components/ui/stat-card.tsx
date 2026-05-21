import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBg: string;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, iconBg, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4',
        className
      )}
    >
      <div
        className={cn(
          'size-12 shrink-0 rounded-full flex items-center justify-center',
          iconBg
        )}
      >
        <Icon className="size-6 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 mt-1 text-xs font-medium',
              trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            <span>{trend.percentage}% vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
