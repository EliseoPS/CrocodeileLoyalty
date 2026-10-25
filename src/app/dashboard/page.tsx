import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DevicePairing from './devices/device-pairing'
import RegistrationQr from './registration-qr'
import BillingButton from './billing/billing-button'
import DashboardNavbar from './navbar'
import { Ban, TriangleAlert } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, businesses(name, slug, timezone, status)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!membership) {
    redirect('/onboarding')
  }

  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses
  const businessId = membership.business_id

  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: inactiveCustomers } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .lt('last_visit_at', thirtyDaysAgo)

  const { count: totalRedemptions } = await supabase
    .from('redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

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

  const statusLabel =
    business?.status === 'active'
      ? 'Activo'
      : business?.status === 'trial'
        ? 'Periodo de prueba'
        : business?.status === 'past_due'
          ? 'Pago pendiente'
          : business?.status === 'suspended'
            ? 'Suspendido'
            : 'Sin estado'

  const statusColor =
    business?.status === 'active' || business?.status === 'trial' ? 'var(--accent-text)' : 'var(--brick)'

  return (
    <>
      <DashboardNavbar businessName={business?.name ?? ''} />

      <main className="min-h-screen px-4 py-8 md:py-12" style={{ background: 'var(--paper)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: statusColor }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
              {statusLabel}
            </span>
          </div>

          {(business?.status === 'past_due' || business?.status === 'suspended') && (
            <div
              className="rounded-lg px-4 py-3 mb-6 text-sm flex items-center gap-2"
              style={{ background: '#C1443B1A', color: 'var(--brick)' }}
            >
              {business.status === 'past_due' ? (
                <TriangleAlert size={16} className="flex-shrink-0" aria-hidden />
              ) : (
                <Ban size={16} className="flex-shrink-0" aria-hidden />
              )}
              {business.status === 'past_due'
                ? 'Tu pago falló. Actualiza tu método de pago antes de que se suspenda el servicio.'
                : 'Tu servicio está suspendido por falta de pago.'}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard label="Clientes registrados" value={totalCustomers ?? 0} />
            <StatCard label="Inactivos (30+ días)" value={inactiveCustomers ?? 0} />
            <StatCard label="Recompensas canjeadas" value={totalRedemptions ?? 0} />
            <StatCard label="Hora pico" value={peakHour ? `${peakHour[0]}:00 hrs` : 'Sin datos'} />
          </div>

          <Section title="QR de registro de clientes">
            <RegistrationQr slug={business!.slug} />
          </Section>

          <Section title="Suscripción">
            <BillingButton status={business?.status ?? 'trial'} />
          </Section>

          <Section title="Dispositivos de cajero">
            <DevicePairing />
          </Section>
        </div>
      </main>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface rounded-xl border border-line p-4">
      <p className="text-2xl font-bold" style={{ color: 'var(--brand-text)', fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl border border-line p-5 md:p-6 mb-6">
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}