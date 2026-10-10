import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('business_members')
    .select('businesses(name, logo_url, brand)')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/onboarding')

  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses

  return (
    <main style={{ padding: 40, maxWidth: 500, margin: '0 auto' }}>
      <h1>Configuración de marca</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>
        Personaliza el logo y color que ven tus clientes en su tarjeta.
      </p>
      <SettingsForm
        currentLogoUrl={business?.logo_url ?? null}
        currentColor={(business?.brand as { color?: string } | null)?.color ?? '#1a1a1a'}
      />
    </main>
  )
}