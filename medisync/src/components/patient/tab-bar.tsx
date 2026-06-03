'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pill, BarChart2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/medications', label: 'Medications', icon: Pill },
  { href: '/adherence',   label: 'Adherence',   icon: BarChart2 },
  { href: '/profile',     label: 'Profile',      icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-sm z-50 flex"
      // pb accounts for iPhone home indicator via safe-area-inset-bottom
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 h-[60px] transition-colors',
              isActive ? 'text-[#0D6B5E]' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Icon className="size-5" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
