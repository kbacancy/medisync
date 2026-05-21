import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/server';
import { SidebarNav } from '@/components/clinician/sidebar-nav';
import { ClinicianHeader } from '@/components/clinician/header';
import { CareAlertsRealtime } from '@/components/telehealth/CareAlertsRealtime';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
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

  const profile: Profile = profileData ?? {
    id: user.id,
    email: user.email ?? '',
    full_name: user.email?.split('@')[0] ?? 'Clinician',
    role: 'clinician',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <>
      <SidebarNav profile={profile} />
      <ClinicianHeader profile={profile} />
      <CareAlertsRealtime doctorId={profile.id} />
      <main className="ml-[240px] mt-16 min-h-[calc(100vh-64px)] bg-[#F4F6F8] overflow-y-auto">
        <div className="p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
      <Toaster richColors position="top-right" />
    </>
  );
}
