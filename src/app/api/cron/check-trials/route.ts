import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('No autorizado', { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // 1. Trials vencidos (nunca se suscribieron) → suspendidos
  const { data: expiredTrials, error: trialError } = await supabase
    .from('businesses')
    .update({ status: 'suspended' })
    .eq('status', 'trial')
    .lt('trial_ends_at', now)
    .select('id')

  // Red de seguridad: un negocio en past_due sin fecha de gracia nunca se suspendería
  // (pasaba cuando el webhook no leía bien la factura). Se le da su periodo de gracia desde hoy.
  await supabase
    .from('businesses')
    .update({ grace_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() })
    .eq('status', 'past_due')
    .is('grace_ends_at', null)

  // 2. Periodo de gracia vencido (pago falló y nunca se regularizó) → suspendidos
  const { data: expiredGrace, error: graceError } = await supabase
    .from('businesses')
    .update({ status: 'suspended' })
    .eq('status', 'past_due')
    .lt('grace_ends_at', now)
    .select('id')

  if (trialError || graceError) {
    return Response.json({ error: trialError?.message || graceError?.message }, { status: 500 })
  }

  return Response.json({
    suspendedTrials: expiredTrials?.length ?? 0,
    suspendedGrace: expiredGrace?.length ?? 0,
  })
}