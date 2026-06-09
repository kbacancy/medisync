'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            padding: '0 10px 6px',
          }}
        >
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
                'relative flex items-center rounded-lg outline-none',
                collapsed ? 'justify-center' : 'gap-2.5',
              )}
              style={{
                height: 38,
                padding: collapsed ? '0' : '0 10px',
                backgroundColor: isActive ? 'rgba(245,130,32,0.14)' : undefined,
                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                fontWeight: isActive ? 500 : 400,
                fontSize: 14,
                transition: 'background-color 120ms ease, color 120ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
                }
              }}
            >
              {/* Orange left border for active item */}
              {isActive && (
                <span
                  className="absolute left-0 top-1 bottom-1 rounded-full"
                  style={{ width: 3, backgroundColor: '#F58220' }}
                />
              )}
              <Icon
                className="shrink-0"
                style={{
                  width: 18,
                  height: 18,
                  color: isActive ? '#F58220' : 'rgba(255,255,255,0.45)',
                  strokeWidth: isActive ? 2 : 1.5,
                }}
              />
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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace('/login');
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-50"
      style={{
        width: collapsed ? 64 : 220,
        backgroundColor: '#17202E',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 300ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo lockup */}
      <div
        className={cn(
          'flex items-center shrink-0 py-5',
          collapsed ? 'justify-center px-3' : 'px-4',
        )}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Bacancy "b" mark — just the orange circle portion of the logo */}
        <div className="shrink-0" style={{ width: 34, height: 34 }}>
          <svg viewBox="0 0 46.62 50.48" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="34" height="34">
            <defs>
              <clipPath id="sb-clip">
                <path d="M23.27,0A23.31,23.31,0,1,1,0,23.31,23.29,23.29,0,0,1,23.27,0Z" transform="translate(0 1.93)" clipRule="evenodd" fill="none"/>
              </clipPath>
            </defs>
            <path fill="#F58220" fillRule="evenodd" d="M23.27,0A23.31,23.31,0,1,1,0,23.31,23.29,23.29,0,0,1,23.27,0Z" transform="translate(0 1.93)"/>
            <g clipPath="url(#sb-clip)">
              <path fill="#fff" fillRule="evenodd" d="M8.8,27.9c0,6.33,3.9,10.7,10.59,13.67V-1.93L8.8-1.79V27.9ZM23.11,24V14.3c18.28-3.05,24.88,26.34.08,27.25V32.12c8.1.51,8.64-9.07-.08-8.09Z" transform="translate(0 1.93)"/>
            </g>
          </svg>
        </div>

        {!collapsed && (
          <div className="ml-2.5 min-w-0">
            <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              MediSync
            </p>
            <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.3, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>
              Clinical Medication Intelligence
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-5">
        <NavSection label="Workspace" items={WORKSPACE} pathname={pathname} collapsed={collapsed} />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '0 -2px' }} />
        <NavSection label="Clinical" items={CLINICAL} pathname={pathname} collapsed={collapsed} />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '0 -2px' }} />
        <NavSection label="System" items={SYSTEM} pathname={pathname} collapsed={collapsed} />
      </nav>

      {/* User profile section */}
      <div className="px-2 py-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div
              className="size-8 rounded-full flex items-center justify-center shrink-0 select-none text-white text-xs font-semibold"
              style={{ backgroundColor: '#F58220' }}
            >
              {getInitials(profile.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF', lineHeight: 1.3 }} className="truncate">
                {profile.full_name}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }} className="truncate capitalize">
                {profile.role}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={cn(
            'flex items-center w-full rounded-lg',
            collapsed ? 'justify-center' : 'gap-2.5',
          )}
          style={{
            height: 36,
            padding: collapsed ? '0' : '0 10px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            fontWeight: 400,
            transition: 'background-color 120ms ease, color 120ms ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
          }}
        >
          <LogOut style={{ width: 18, height: 18, flexShrink: 0, strokeWidth: 1.5, color: 'rgba(255,255,255,0.35)' }} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute flex items-center justify-center z-10"
        style={{
          right: -12,
          top: 72,
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: '#17202E',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          transition: 'background-color 120ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1E2D40'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#17202E'; }}
      >
        {collapsed ? (
          <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.6)' }} />
        ) : (
          <ChevronLeft style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.6)' }} />
        )}
      </button>
    </aside>
  );
}
