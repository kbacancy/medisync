'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Pill, BarChart2, User, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const tabs = [
  { href: '/medications', label: 'Medications', icon: Pill },
  { href: '/adherence',   label: 'Adherence',   icon: BarChart2 },
  { href: '/messages',    label: 'Messages',     icon: MessageCircle },
  { href: '/profile',     label: 'Profile',      icon: User },
];

export function TabBar({ patientId }: { patientId?: string | null }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!patientId) return;
    const supabase = createClient();

    function fetchUnread() {
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', patientId!)
        .eq('sender_role', 'clinician')
        .eq('is_read', false)
        .then(({ count }) => setUnread(count ?? 0));
    }

    fetchUnread();

    if (pathname === '/messages') {
      setUnread(0);
      return;
    }

    const channel = supabase
      .channel(`tab-unread-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const msg = payload.new as { sender_role: string };
          if (msg.sender_role === 'clinician') {
            setUnread((c) => c + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, pathname]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex"
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
        const showBadge = href === '/messages' && unread > 0;
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
            style={{
              color: isActive ? 'var(--ms-primary)' : '#9A9A9A',
              minHeight: 44,
            }}
          >
            <div className="relative">
              <Icon
                style={{
                  width: 22,
                  height: 22,
                  strokeWidth: isActive ? 2 : 1.5,
                }}
              />
              {showBadge && (
                <span
                  className="absolute -top-1 -right-1 size-2 rounded-full"
                  style={{ backgroundColor: 'var(--ms-critical)' }}
                />
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
