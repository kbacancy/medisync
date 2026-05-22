'use client';

import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { SidebarNav } from './sidebar-nav';
import { ClinicianHeader } from './header';
import { CareAlertsRealtime } from '@/components/telehealth/CareAlertsRealtime';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type { Profile } from '@/types';

interface ClinicianShellProps {
  profile: Profile;
  children: React.ReactNode;
}

const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 64;

export function ClinicianShell({ profile, children }: ClinicianShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('sidebar-collapsed') === 'true') setCollapsed(true);
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <>
      <SidebarNav profile={profile} collapsed={collapsed} onToggle={toggle} />
      <ClinicianHeader profile={profile} sidebarWidth={sidebarWidth} />
      <CareAlertsRealtime doctorId={profile.id} />
      <main
        className="mt-16 min-h-[calc(100vh-64px)] overflow-y-auto"
        style={{
          marginLeft: sidebarWidth,
          backgroundColor: 'var(--ms-surface-raised)',
          transition: 'margin-left 300ms ease',
        }}
      >
        <div className="p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
      <Toaster richColors position="bottom-right" />
    </>
  );
}
