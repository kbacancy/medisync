'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bell,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  BookOpen,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { EmergencyModal } from '@/components/clinician/EmergencyModal';
import type { CareAlert, Profile } from '@/types';

interface ClinicianHeaderProps {
  profile: Profile;
  sidebarWidth: number;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/telehealth': 'Telehealth',
  '/schedule': 'Schedule',
  '/settings': 'Settings',
};

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

function getTitle(pathname: string) {
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === route || pathname.startsWith(route + '/')) return title;
  }
  return 'MediSync';
}

function SeverityIcon({ severity }: { severity: CareAlert['severity'] }) {
  if (severity === 'high' || severity === 'critical')
    return <AlertTriangle className="size-3.5 shrink-0" style={{ color: 'var(--ms-critical)' }} />;
  if (severity === 'moderate')
    return <AlertCircle className="size-3.5 shrink-0" style={{ color: 'var(--ms-warn)' }} />;
  return <Info className="size-3.5 shrink-0" style={{ color: 'var(--ms-blue)' }} />;
}

export function ClinicianHeader({ profile, sidebarWidth }: ClinicianHeaderProps) {
  const pathname = usePathname();
  const title = getTitle(pathname);

  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const alerts = useNotificationStore((s) => s.alerts);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setHelpOpen(false);
    }
    if (notifOpen || helpOpen) document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [notifOpen, helpOpen]);

  async function handleMarkAllRead() {
    markAllRead();
    setNotifOpen(false);
    const supabase = createClient();
    await supabase.from('care_alerts').update({ is_read: true }).eq('is_read', false);
  }

  const recentAlerts = alerts.slice(0, 5);
  const color = avatarColor(profile.full_name);

  return (
    <header
      className="fixed top-0 right-0 h-16 z-40 flex items-center justify-between px-6"
      style={{
        left: sidebarWidth,
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--ms-border)',
        boxShadow: 'var(--ms-shadow-sm)',
        transition: 'left 300ms ease',
      }}
    >
      {/* Left: page title */}
      <h1
        className="text-[17px] font-semibold truncate"
        style={{ color: 'var(--ms-text-primary)', letterSpacing: '-0.02em' }}
      >
        {title}
      </h1>

      {/* Right: action cluster */}
      <div className="flex items-center gap-1.5">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((p) => !p); setHelpOpen(false); }}
            className="relative p-2 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--ms-text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--ms-surface-raised)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
                style={{ backgroundColor: 'var(--ms-critical)' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl z-50 overflow-hidden"
              style={{ boxShadow: 'var(--ms-shadow-lg)', border: '1px solid var(--ms-border)' }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--ms-border)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--ms-text-primary)' }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span
                      className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: '#FEE2E2', color: 'var(--ms-critical)' }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {recentAlerts.length === 0 ? (
                  <p
                    className="text-xs text-center py-8"
                    style={{ color: 'var(--ms-text-tertiary)' }}
                  >
                    No notifications
                  </p>
                ) : (
                  recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-2.5 px-4 py-3"
                      style={{
                        backgroundColor: !alert.is_read ? 'var(--ms-surface-raised)' : undefined,
                        borderBottom: '1px solid var(--ms-border)',
                      }}
                    >
                      <SeverityIcon severity={alert.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug line-clamp-2"
                          style={{ color: 'var(--ms-text-primary)' }}>
                          {alert.message}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--ms-text-tertiary)' }}>
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {recentAlerts.length > 0 && (
                <div
                  className="px-4 py-2.5"
                  style={{ borderTop: '1px solid var(--ms-border)' }}
                >
                  <button
                    onClick={handleMarkAllRead}
                    className="w-full text-xs font-medium text-center hover:underline"
                    style={{ color: 'var(--ms-primary)' }}
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help icon */}
        <div className="relative" ref={helpRef}>
          <button
            onClick={() => { setHelpOpen((p) => !p); setNotifOpen(false); }}
            className="p-2 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--ms-text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--ms-surface-raised)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
            aria-label="Help"
          >
            <HelpCircle className="size-5" />
          </button>

          {helpOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl z-50 overflow-hidden"
              style={{ boxShadow: 'var(--ms-shadow-lg)', border: '1px solid var(--ms-border)' }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--ms-border)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--ms-text-primary)' }}>
                  Help &amp; Support
                </span>
              </div>
              <div className="py-1">
                {[
                  { href: 'mailto:support@medisync.health', icon: Mail, label: 'Contact Support', external: false },
                  { href: 'https://docs.medisync.health', icon: BookOpen, label: 'Documentation', external: true },
                ].map(({ href, icon: Icon, label, external }) => (
                  <a
                    key={label}
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150"
                    style={{ color: 'var(--ms-text-primary)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--ms-surface-raised)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                    onClick={() => setHelpOpen(false)}
                  >
                    <Icon className="size-4 shrink-0" style={{ color: 'var(--ms-text-tertiary)' }} />
                    {label}
                    {external && (
                      <ExternalLink className="size-3 ml-auto" style={{ color: 'var(--ms-text-tertiary)' }} />
                    )}
                  </a>
                ))}
              </div>
              <div
                className="px-4 py-3"
                style={{ borderTop: '1px solid var(--ms-border)', backgroundColor: 'var(--ms-surface-raised)' }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--ms-text-tertiary)' }}
                >
                  Shortcuts
                </p>
                <div className="space-y-1.5">
                  {[
                    ['Patients', 'G then P'],
                    ['Telehealth', 'G then T'],
                    ['Schedule', 'G then S'],
                  ].map(([action, keys]) => (
                    <div key={action} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--ms-text-secondary)' }}>
                        {action}
                      </span>
                      <kbd
                        className="text-[10px] rounded px-1.5 py-0.5 font-mono"
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid var(--ms-border)',
                          color: 'var(--ms-text-secondary)',
                        }}
                      >
                        {keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Emergency pill */}
        <button
          onClick={() => setEmergencyOpen(true)}
          className="flex items-center gap-1.5 rounded-full text-white text-xs font-semibold px-3.5 py-1.5 transition-colors duration-150"
          style={{
            backgroundColor: 'var(--ms-critical)',
            boxShadow: '0 2px 8px rgba(220,38,38,0.30)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#b91c1c'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--ms-critical)'; }}
        >
          <AlertTriangle className="size-3.5" />
          EMERGENCY
        </button>

        <EmergencyModal
          open={emergencyOpen}
          onClose={() => setEmergencyOpen(false)}
          clinicianName={profile.full_name}
        />

        {/* Avatar */}
        <div
          className="size-8 rounded-full flex items-center justify-center text-white text-xs font-semibold select-none ml-1 shrink-0"
          style={{ backgroundColor: color }}
        >
          {getInitials(profile.full_name)}
        </div>
      </div>
    </header>
  );
}
