import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LandingPage from '@/components/marketing/LandingPage';

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role ?? 'patient';

    if (role === 'clinician' || role === 'coordinator') {
      redirect('/dashboard');
    }

    redirect('/medications');
  }

  return <LandingPage />;
}
