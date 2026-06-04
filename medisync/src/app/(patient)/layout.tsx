import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/server';
import { PatientHeader } from '@/components/patient/header';
import { TabBar } from '@/components/patient/tab-bar';
import { OfflineBanner } from '@/components/patient/OfflineBanner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type { Profile } from '@/types';

export default async function PatientLayout({
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

  // Determine role: prefer DB profile, fall back to JWT user_metadata.
  const dbRole = profileData?.role as string | undefined;
  const metaRole = user.user_metadata?.role as string | undefined;
  const resolvedRole = dbRole ?? metaRole;

  // Clinicians who reach a patient route get sent to their dashboard.
  if (resolvedRole === 'clinician' || resolvedRole === 'coordinator') {
    redirect('/dashboard');
  }

  const profile: Profile = profileData ?? {
    id: user.id,
    email: user.email ?? '',
    full_name: user.email?.split('@')[0] ?? 'Patient',
    role: 'patient',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <>
      <PatientHeader profile={profile} />
      <OfflineBanner />
      <InstallPrompt />
      {/* Bottom padding = tab bar (60px) + iPhone safe-area-inset-bottom */}
      <main
        className="mt-[56px] bg-[#F4F6F8] min-h-[calc(100vh-116px)] overflow-y-auto"
        style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <TabBar />
      <Toaster richColors position="top-center" />
    </>
  );
}
