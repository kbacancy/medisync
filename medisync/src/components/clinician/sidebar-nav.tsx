'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Video,
  Calendar,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface SidebarNavProps {
  profile: Profile;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/telehealth', label: 'Telehealth', icon: Video },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function SidebarNav({ profile }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#0D6B5E] flex flex-col z-50">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-white/10">
        <p className="text-white font-bold text-xl leading-tight">MediSync</p>
        <p className="text-white/55 text-xs mt-0.5">Health System</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-[#0D6B5E]'
                  : 'text-white hover:bg-white/10'
              )}
            >
              <Icon className="size-4.5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3 px-3">
          <div className="size-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">
              {getInitials(profile.full_name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {profile.full_name}
            </p>
            <p className="text-white/55 text-xs capitalize truncate">
              {profile.role}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors"
        >
          <LogOut className="size-4.5 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
