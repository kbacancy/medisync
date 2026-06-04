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

  // Profile missing → can't confirm role → re-authenticate rather than
  // guessing. This covers new accounts and transient DB errors.
  if (!profileData) {
    redirect('/login');
  }

  // Patients who reach a clinician route are sent to their own home.
  if (profileData.role === 'patient') {
    redirect('/medications');
  }

  const profile: Profile = profileData;

  return <ClinicianShell profile={profile}>{children}</ClinicianShell>;
}
