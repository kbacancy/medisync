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

  // Determine role: prefer DB profile, fall back to JWT user_metadata
  // (written at sign-up, trusted, avoids locking out clinicians on
  // transient DB misses which would otherwise cause a redirect loop).
  const dbRole = profileData?.role as string | undefined;
  const metaRole = user.user_metadata?.role as string | undefined;
  const resolvedRole = dbRole ?? metaRole;

  // Patients (or anyone whose role resolves to patient) get sent home.
  if (resolvedRole === 'patient') {
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
