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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

const WORKSPACE = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];
const CLINICAL = [
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/telehealth', label: 'Telehealth', icon: Video },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
];
const SYSTEM = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

function avatarColor(name: string) {
  const palette = ['#0A7B5C', '#3B82F6', '#7C3AED', '#DB2777', '#D97706', '#059669'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

interface SidebarNavProps {
  profile: Profile;
  collapsed: boolean;
  onToggle: () => void;
}

type NavItem = { href: string; label: string; icon: React.ElementType };

function NavSection({
  label,
  items,
  pathname,
  collapsed,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div>
      {!collapsed && (
        <p className="px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-widest uppercase"
          style={{ color: 'var(--ms-text-tertiary)' }}>
          {label}
        </p>
      )}
      <div className="space-y-0.5">
        {items.map(({ href, label: itemLabel, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? itemLabel : undefined}
              className={cn(
                'relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 outline-none',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
                isActive
                  ? 'text-[#0A7B5C]'
                  : 'hover:text-[#0F1117]'
              )}
              style={
                isActive
                  ? { backgroundColor: 'var(--ms-primary-light)' }
                  : { color: 'var(--ms-text-secondary)' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--ms-surface-raised)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                }
              }}
            >
              {isActive && !collapsed && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ backgroundColor: 'var(--ms-primary)' }}
                />
              )}
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span>{itemLabel}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SidebarNav({ profile, collapsed, onToggle }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const color = avatarColor(profile.full_name);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-50 bg-white"
      style={{
        width: collapsed ? 64 : 240,
        borderRight: '1px solid var(--ms-border)',
        boxShadow: 'var(--ms-shadow-sm)',
        transition: 'width 300ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo lockup */}
      <div
        className={cn(
          'flex items-center shrink-0 py-5',
          collapsed ? 'justify-center px-3' : 'px-5'
        )}
        style={{ borderBottom: '1px solid var(--ms-border)' }}
      >
        <div
          className="size-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--ms-primary)' }}
        >
          <span className="text-white text-xs font-bold select-none">M</span>
        </div>
        {!collapsed && (
          <div className="ml-3 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate"
              style={{ color: 'var(--ms-text-primary)' }}>
              MediSync
            </p>
            <p className="text-[11px] leading-tight truncate"
              style={{ color: 'var(--ms-text-tertiary)' }}>
              Health System
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-4">
        <NavSection label="WORKSPACE" items={WORKSPACE} pathname={pathname} collapsed={collapsed} />
        <div style={{ borderTop: '1px solid var(--ms-border)' }} />
        <NavSection label="CLINICAL" items={CLINICAL} pathname={pathname} collapsed={collapsed} />
        <div style={{ borderTop: '1px solid var(--ms-border)' }} />
        <NavSection label="SYSTEM" items={SYSTEM} pathname={pathname} collapsed={collapsed} />
      </nav>

      {/* User profile section */}
      <div
        className="px-2 py-3 space-y-0.5"
        style={{ borderTop: '1px solid var(--ms-border)' }}
      >
        {!collapsed && (
          <div className={cn('flex items-center gap-3 px-3 py-2 rounded-lg')}>
            <div
              className="size-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-semibold select-none"
              style={{ backgroundColor: color }}
            >
              {getInitials(profile.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate"
                style={{ color: 'var(--ms-text-primary)' }}>
                {profile.full_name}
              </p>
              <p className="text-xs capitalize truncate"
                style={{ color: 'var(--ms-text-tertiary)' }}>
                {profile.role}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={cn(
            'flex items-center w-full rounded-lg text-sm font-medium transition-colors duration-150',
            collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
          )}
          style={{ color: 'var(--ms-text-secondary)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              'var(--ms-surface-raised)';
            (e.currentTarget as HTMLElement).style.color =
              'var(--ms-text-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
            (e.currentTarget as HTMLElement).style.color =
              'var(--ms-text-secondary)';
          }}
        >
          <LogOut className="size-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute flex items-center justify-center bg-white rounded-full hover:bg-gray-50 transition-colors z-10"
        style={{
          right: -12,
          top: 72,
          width: 24,
          height: 24,
          border: '1px solid rgba(0,0,0,0.12)',
          boxShadow: 'var(--ms-shadow-sm)',
        }}
      >
        {collapsed ? (
          <ChevronRight className="size-3.5" style={{ color: 'var(--ms-text-secondary)' }} />
        ) : (
          <ChevronLeft className="size-3.5" style={{ color: 'var(--ms-text-secondary)' }} />
        )}
      </button>
    </aside>
  );
}
