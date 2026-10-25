import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import type Stripe from 'stripe'

const GRACE_DAYS = 5

type Admin = ReturnType<typeof createAdminClient>

// En las versiones de API recientes (2025-03-31.basil en adelante) la factura ya no trae
// `invoice.subscription`; viene en `invoice.parent.subscription_details.subscription`.
// Se leen ambas por si el endpoint del webhook está fijado a una versión vieja.
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const fromParent = invoice.parent?.subscription_details?.subscription
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription
  const ref = fromParent ?? legacy
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref.id
}

async function findBusinessId(admin: Admin, subscriptionId: string, metadataBusinessId?: string) {
  const { data } = await admin
    .from('subscriptions')
    .select('business_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()
  return data?.business_id ?? metadataBusinessId ?? null
}

async function markActive(admin: Admin, businessId: string) {
  await admin.from('businesses').update({ status: 'active', grace_ends_at: null }).eq('id', businessId)
}

// Pago fallido: el negocio sigue funcionando GRACE_DAYS días; luego el cron diario lo suspende.
// Si ya tenía periodo de gracia corriendo (reintentos de Stripe), no se reinicia.
async function markPastDue(admin: Admin, businessId: string) {
  await admin.from('businesses').update({ status: 'past_due' }).eq('id', businessId).neq('status', 'suspended')
  await admin
    .from('businesses')
    .update({ grace_ends_at: new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString() })
    .eq('id', businessId)
    .is('grace_ends_at', null)
}

async function markSuspended(admin: Admin, businessId: string) {
  await admin.from('businesses').update({ status: 'suspended' }).eq('id', businessId)
}

async function handleEvent(admin: Admin, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const businessId = session.metadata?.business_id
      if (!businessId) return

      const { error } = await admin.from('subscriptions').upsert({
        business_id: businessId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      if (error) throw error

      await markActive(admin, businessId)
      return
    }

    case 'invoice.payment_failed':
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = getInvoiceSubscriptionId(invoice)
      if (!subscriptionId) return

      const businessId = await findBusinessId(admin, subscriptionId)
      if (!businessId) return

      const failed = event.type === 'invoice.payment_failed'
      await admin
        .from('subscriptions')
        .update({ status: failed ? 'past_due' : 'active', updated_at: new Date().toISOString() })
        .eq('business_id', businessId)

      if (failed) await markPastDue(admin, businessId)
      else await markActive(admin, businessId)
      return
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const businessId = await findBusinessId(admin, subscription.id, subscription.metadata?.business_id)
      if (!businessId) return

      await admin
        .from('subscriptions')
        .update({ status: subscription.status, updated_at: new Date().toISOString() })
        .eq('business_id', businessId)

      if (event.type === 'customer.subscription.deleted') {
        await markSuspended(admin, businessId)
        return
      }

      switch (subscription.status) {
        case 'active':
        case 'trialing':
          await markActive(admin, businessId)
          break
        case 'past_due':
          await markPastDue(admin, businessId)
          break
        case 'unpaid':
        case 'canceled':
        case 'incomplete_expired':
        case 'paused':
          await markSuspended(admin, businessId)
          break
        // 'incomplete': el primer cobro sigue en proceso; checkout.session.completed lo resuelve
      }
      return
    }
  }
}

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')
  if (!signature) return new Response('Falta firma', { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Firma de webhook inválida:', err)
    return new Response('Firma inválida', { status: 400 })
  }

  const admin = createAdminClient()

  // Idempotencia: si ya procesamos este evento, no lo repetimos
  const { data: existing } = await admin
    .from('billing_events')
    .select('stripe_event_id')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existing) return new Response('OK (duplicado)', { status: 200 })

  try {
    await handleEvent(admin, event)
  } catch (err) {
    // Sin registrar el evento: respondemos 500 para que Stripe lo reintente
    console.error(`Error procesando ${event.type}:`, err)
    return new Response('Error procesando el evento', { status: 500 })
  }

  // Se registra hasta después de procesarlo; antes, un fallo a medias lo marcaba como hecho
  await admin.from('billing_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  })

  return new Response('OK', { status: 200 })
}
