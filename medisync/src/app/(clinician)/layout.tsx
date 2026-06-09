import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClinicianShell } from '@/components/clinician/shell';
import type { Profile } from '@/types';

export default async function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Only trust the confirmed DB role — never fall back to user_metadata
  // which can be updated by the client via supabase.auth.updateUser().
  const resolvedRole = profileData?.role as string | undefined;

  if (!resolvedRole || resolvedRole === 'patient') {
    redirect('/medications');
  }

  const emailPrefix = user.email?.split('@')[0] ?? 'Clinician';
  const displayFallback = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

  const profile: Profile = profileData ?? {
    id: user.id,
    email: user.email ?? '',
    full_name: displayFallback,
    role: 'clinician',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return <ClinicianShell profile={profile}>{children}</ClinicianShell>;
}
