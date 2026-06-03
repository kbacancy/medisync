import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from 'sonner'

// Fullscreen layout — no header, no tab bar.
// Used for the video call page so Jitsi can occupy the whole viewport without
// competing z-index or overflow clipping from the patient shell layout.
export default async function FullscreenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <>
      {children}
      <Toaster richColors position="top-center" />
    </>
  )
}
