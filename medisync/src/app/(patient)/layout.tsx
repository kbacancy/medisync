import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/server';
import { PatientHeader } from '@/components/patient/header';
import { TabBar } from '@/components/patient/tab-bar';
import { OfflineBanner } from '@/components/patient/OfflineBanner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { IosInstallBanner } from '@/components/pwa/IosInstallBanner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { IncomingCallListener } from '@/components/patient/IncomingCallListener';
import { PushSubscriber } from '@/components/patient/PushSubscriber';
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

  const { data: patientRecord } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();

  const patientId = patientRecord?.id ?? null;

  // Only trust the confirmed DB role — never fall back to user_metadata
  // which can be updated by the client via supabase.auth.updateUser().
  const resolvedRole = profileData?.role as string | undefined;

  if (resolvedRole === 'clinician') {
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
      {/* Top padding = header (56px) + iOS status bar; bottom = tab bar (49px) + home indicator */}
      <main
        className="min-h-screen overflow-y-auto"
        style={{
          backgroundColor: 'var(--ms-page)',
          paddingTop: 'calc(56px + env(safe-area-inset-top))',
          paddingBottom: 'calc(49px + env(safe-area-inset-bottom))',
        }}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <TabBar patientId={patientId} />
      <Toaster richColors position="top-center" />
      {/* Global realtime call alert — works on every patient page and covers
          iOS Safari where push notifications require standalone PWA mode */}
      {patientId && <IncomingCallListener patientId={patientId} />}
      <PushSubscriber userId={user.id} />
      <IosInstallBanner />
    </>
  );
}
