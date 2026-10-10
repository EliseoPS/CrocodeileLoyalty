import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import type Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
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

  await admin.from('billing_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  })

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const businessId = session.metadata?.business_id
      if (!businessId) break

      await admin.from('subscriptions').upsert({
        business_id: businessId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        status: 'active',
        updated_at: new Date().toISOString(),
      })

      await admin.from('businesses').update({ status: 'active' }).eq('id', businessId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = (invoice as unknown as { subscription?: string }).subscription
      if (!subscriptionId) break

      const { data: sub } = await admin
        .from('subscriptions')
        .select('business_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single()

      if (!sub) break

      const graceEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

      await admin
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('business_id', sub.business_id)

      await admin
        .from('businesses')
        .update({ status: 'past_due', grace_ends_at: graceEndsAt })
        .eq('id', sub.business_id)
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const businessId = subscription.metadata?.business_id

      const { data: sub } = await admin
        .from('subscriptions')
        .select('business_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()

      const resolvedBusinessId = sub?.business_id ?? businessId
      if (!resolvedBusinessId) break

      const newStatus = subscription.status === 'active' ? 'active' : subscription.status === 'canceled' ? 'suspended' : 'past_due'

      await admin
        .from('subscriptions')
        .update({ status: subscription.status, updated_at: new Date().toISOString() })
        .eq('business_id', resolvedBusinessId)

      await admin.from('businesses').update({ status: newStatus }).eq('id', resolvedBusinessId)
      break
    }
  }

  return new Response('OK', { status: 200 })
}