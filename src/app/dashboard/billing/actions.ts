'use server'

import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function createCheckoutSession(): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No has iniciado sesión' }

  const userEmail = user.email

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, businesses(name)')
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'No tienes negocio' }

  const businessId = membership.business_id

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('business_id', businessId)
    .maybeSingle()

  const customerId = existingSub?.stripe_customer_id || undefined

  async function createSession(withCustomer: boolean) {
    return stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: withCustomer ? customerId : undefined,
      customer_email: withCustomer ? undefined : userEmail,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=cancelled`,
      metadata: { business_id: businessId },
      subscription_data: { metadata: { business_id: businessId } },
    })
  }

  try {
    const session = customerId ? await createSession(true) : await createSession(false)
    return { url: session.url! }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (customerId && message.includes('No such customer')) {
      await supabase.from('subscriptions').update({ stripe_customer_id: null }).eq('business_id', businessId)
      const session = await createSession(false)
      return { url: session.url! }
    }
    return { error: message || 'Error al crear la sesión de pago' }
  }
}

export async function createPortalSession(): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No has iniciado sesión' }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'No tienes negocio' }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('business_id', membership.business_id)
    .single()

  if (!sub?.stripe_customer_id) return { error: 'No tienes una suscripción activa' }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  })

  return { url: session.url }
}