'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Video, Calendar, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients',   label: 'Patients',   icon: Users },
  { href: '/telehealth', label: 'Telehealth', icon: Video },
  { href: '/schedule',   label: 'Schedule',   icon: Calendar },
  { href: '/settings',   label: 'Settings',   icon: Settings },
];

export function ClinicianMobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 flex md:hidden"
      style={{
        borderColor: 'var(--ms-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 h-[60px] transition-colors text-[11px] font-medium',
              isActive ? 'text-[#0A7B5C]' : 'text-gray-400'
            )}
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
