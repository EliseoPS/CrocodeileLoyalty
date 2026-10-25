import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// La página de onboarding es un Client Component; este layout (servidor) decide antes de
// mostrarla: sin sesión → login, y si el dueño ya tiene negocio → panel (no crear otro).
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (membership) redirect('/dashboard')

  return children
}
