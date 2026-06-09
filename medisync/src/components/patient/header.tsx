'use client';

import { Bell, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface PatientHeaderProps {
  profile: Profile;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function PatientHeader({ profile }: PatientHeaderProps) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace('/login');
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        backgroundColor: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      <div className="h-14 flex items-center justify-between px-4">
        <span
          style={{
            fontWeight: 600,
            fontSize: 17,
            letterSpacing: '-0.02em',
            color: 'var(--ms-primary)',
          }}
        >
          MediSync
        </span>

        <div className="flex items-center gap-1">
          <button
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: 'var(--ms-text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ms-surface-raised)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Bell className="size-5" />
            <span
              className="absolute top-1.5 right-1.5 size-2 rounded-full"
              style={{ backgroundColor: 'var(--ms-warn)' }}
            />
          </button>

          <div
            className="size-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--ms-primary)' }}
          >
            <span className="text-white text-xs font-semibold">
              {getInitials(profile.full_name)}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg transition-colors group"
            aria-label="Sign out"
            title="Sign out"
            style={{ color: 'var(--ms-text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.06)';
              e.currentTarget.style.color = 'var(--ms-critical)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--ms-text-tertiary)';
            }}
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
