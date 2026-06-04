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

  // Redirect anyone who is not explicitly a clinician/coordinator.
  // Checking for the positive set (not just === 'patient') means a missing
  // profile or an unknown role is also blocked rather than silently allowed.
  if (!profileData || (profileData.role !== 'clinician' && profileData.role !== 'coordinator')) {
    redirect('/medications');
  }

  const profile: Profile = profileData;

  return <ClinicianShell profile={profile}>{children}</ClinicianShell>;
}
