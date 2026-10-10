import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DevicePairing from './devices/device-pairing'
import RegistrationQr from './registration-qr'
import BillingButton from './billing/billing-button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, businesses(name, slug, timezone, status)')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/onboarding')
  }

  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses
  const businessId = membership.business_id

  // 1. Clientes registrados
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

  // 2. Clientes inactivos (sin visitar en 30+ días)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: inactiveCustomers } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .lt('last_visit_at', thirtyDaysAgo)

  // 3. Recompensas canjeadas (todas)
  const { count: totalRedemptions } = await supabase
    .from('redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

  // 4. Sellos dados por hora (últimos 90 días) — lo calculamos en JS por ahora
  const { data: earnTransactions } = await supabase
    .from('transactions')
    .select('created_at')
    .eq('business_id', businessId)
    .eq('type', 'earn')
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

  const hourCounts: Record<number, number> = {}
  earnTransactions?.forEach((tx) => {
    const hour = new Date(tx.created_at).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <main style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
      <h1>{business?.name}</h1>

      <RegistrationQr slug={business!.slug} />

      {(business?.status === 'past_due' || business?.status === 'suspended') && (
        <div style={{ background: '#5c1a1a', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {business.status === 'past_due'
            ? '⚠️ Tu pago falló. Actualiza tu método de pago antes de que se suspenda el servicio.'
            : '🚫 Tu servicio está suspendido por falta de pago.'}
        </div>
      )}

      <BillingButton status={business?.status ?? 'trial'} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <Stat label="Clientes registrados" value={totalCustomers ?? 0} />
        <Stat label="Inactivos (30+ días)" value={inactiveCustomers ?? 0} />
        <Stat label="Recompensas canjeadas" value={totalRedemptions ?? 0} />
        <Stat
          label="Hora pico"
          value={peakHour ? `${peakHour[0]}:00 hrs` : 'Sin datos aún'}
        />
      </div>

      <DevicePairing />

      <a href="/dashboard/settings" style={{ display: 'inline-block', marginTop: 16 }}>
        <button type="button">Configuración de marca</button>
      </a>
      
      <form
        action={async () => {
          'use server'
          const { createClient } = await import('@/lib/supabase/server')
          const supabase = await createClient()
          await supabase.auth.signOut()
          redirect('/login')
        }}
        style={{ marginTop: 32 }}
      >
        <button type="submit">Cerrar sesión</button>
      </form>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 16 }}>
      <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>{value}</p>
      <p style={{ color: '#888', margin: 0 }}>{label}</p>
    </div>
  )
}