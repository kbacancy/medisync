'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Video, Calendar, Settings } from 'lucide-react';

const tabs = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/patients',   label: 'Patients',    icon: Users },
  { href: '/telehealth', label: 'Telehealth',  icon: Video },
  { href: '/schedule',   label: 'Schedule',    icon: Calendar },
  { href: '/settings',   label: 'Settings',    icon: Settings },
];

export function ClinicianMobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden"
      style={{
        height: 'calc(49px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '0.5px solid rgba(0,0,0,0.1)',
      }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
            style={{
              color: isActive ? '#1A7A5E' : '#9A9A9A',
              minHeight: 44,
            }}
          >
            <Icon
              style={{
                width: 22,
                height: 22,
                strokeWidth: isActive ? 2 : 1.5,
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
