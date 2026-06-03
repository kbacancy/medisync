'use client';

import { Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-40 flex items-center justify-between px-4">
      <span className="font-bold text-[#0D6B5E] text-lg">MediSync</span>
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="size-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 size-2 bg-amber-400 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="size-8 rounded-full bg-[#0D6B5E] flex items-center justify-center">
          <span className="text-white text-xs font-semibold">
            {getInitials(profile.full_name)}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-5 text-gray-400 group-hover:text-red-500 transition-colors" />
        </button>
      </div>
    </header>
  );
}
