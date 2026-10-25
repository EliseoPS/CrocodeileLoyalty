import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './settings-form'
import DashboardNavbar from './../navbar'


export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('business_members')
    .select('businesses(name, logo_url, brand)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!membership) redirect('/onboarding')

  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses

  return (
    <>
      <DashboardNavbar businessName={business?.name ?? ''} />
      <main className="min-h-screen px-4 py-8 md:py-12" style={{ background: 'var(--paper)' }}>
        <div className="max-w-xl mx-auto bg-surface rounded-xl border border-line p-6 md:p-10">
          <a
            href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium mb-6"
              style={{ color: 'var(--ink-soft)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver al panel
          </a>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}
          >
            Configuración de marca
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-soft)' }}>
            Personaliza el logo y color que ven tus clientes en su tarjeta.
          </p>
          <SettingsForm
            currentLogoUrl={business?.logo_url ?? null}
            currentColor={(business?.brand as { color?: string } | null)?.color ?? '#1a1a1a'}
          />
        </div>
      </main>
    </>
  )
}