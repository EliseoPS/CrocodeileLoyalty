import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Gift } from 'lucide-react'
import RegisterForm from './register-form'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createAdminClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, logo_url, status')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: program } = await supabase
    .from('programs')
    .select('id, name, reward_description')
    .eq('business_id', business.id)
    .eq('active', true)
    .limit(1)
    .single()

  // Suspendido por falta de pago: no acepta registros nuevos (Términos, sección 3)
  const acceptingSignups = business.status !== 'suspended' && business.status !== 'canceled'

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--paper)' }}>
      <div className="w-full max-w-sm">
        {/* Encabezado del negocio */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-surface border border-line flex items-center justify-center overflow-hidden mb-3">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              <span
                className="text-2xl font-bold"
                style={{ color: 'var(--brand-text)', fontFamily: 'var(--font-display)' }}
              >
                {business.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}
          >
            {business.name}
          </h1>
        </div>

        <div className="bg-surface rounded-xl border border-line p-6 md:p-8">
          {program && acceptingSignups ? (
            <>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}
              >
                Obtén tu tarjeta de lealtad
              </h2>
              {program.reward_description && (
                <>
                  <p className="text-sm font-medium mt-3 mb-1.5" style={{ color: 'var(--ink-soft)' }}>
                    Regístrate ahora y gana:
                  </p>
                  <div
                    className="flex items-start gap-2.5 rounded-md px-3 py-2.5 mb-6 text-sm"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}
                  >
                    <Gift size={18} strokeWidth={2} className="flex-shrink-0" aria-hidden />
                    <span>{program.reward_description}</span>
                  </div>
                </>
              )}
              {!program.reward_description && <div className="mb-6" />}
              <RegisterForm businessId={business.id} programId={program.id} />
            </>
          ) : (
            <p className="text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
              {acceptingSignups
                ? 'Este negocio aún no tiene un programa de lealtad activo. Vuelve a intentarlo más tarde.'
                : 'Este negocio no está aceptando registros nuevos por el momento. Vuelve a intentarlo más tarde.'}
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-center" style={{ color: 'var(--ink-soft)' }}>
          Tarjetas de lealtad por Crocodeile
        </p>
      </div>
    </main>
  )
}
