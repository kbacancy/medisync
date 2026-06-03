'use client';

import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { SidebarNav } from './sidebar-nav';
import { ClinicianHeader } from './header';
import { ClinicianMobileTabBar } from './mobile-tab-bar';
import { CareAlertsRealtime } from '@/components/telehealth/CareAlertsRealtime';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('sidebar-collapsed') === 'true') setCollapsed(true);
    } catch {}

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
  // On mobile the sidebar is hidden — content takes full width
  const mainMargin = isMobile ? 0 : sidebarWidth;

  return (
    <>
      {/* Sidebar: hidden on mobile via CSS, visible on md+ */}
      <div className="hidden md:block">
        <SidebarNav profile={profile} collapsed={collapsed} onToggle={toggle} />
      </div>

      <ClinicianHeader profile={profile} sidebarWidth={isMobile ? 0 : sidebarWidth} />
      <CareAlertsRealtime doctorId={profile.id} />

      <main
        className="mt-16 min-h-[calc(100vh-64px)] overflow-y-auto"
        style={{
          marginLeft: mainMargin,
          // Bottom padding for mobile tab bar + safe-area; none on desktop
          paddingBottom: isMobile ? 'calc(60px + env(safe-area-inset-bottom))' : 0,
          backgroundColor: 'var(--ms-surface-raised)',
          transition: 'margin-left 300ms ease',
        }}
      >
        <div className="p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>

      {/* Mobile bottom tab bar (hidden on desktop via CSS) */}
      <ClinicianMobileTabBar />

      <InstallPrompt />
      <Toaster richColors position="bottom-right" />
    </>
  );
}
