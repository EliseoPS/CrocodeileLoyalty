'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

export async function registerCustomer({
  businessId,
  programId,
  name,
  phone,
}: {
  businessId: string
  programId: string
  name: string
  phone: string
}) {
  const supabase = createAdminClient()

  // Busca si ya existe un cliente con ese teléfono en este negocio
  let { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .single()

  if (!customer) {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({ business_id: businessId, name, phone, consent_at: new Date().toISOString() })
      .select('id')
      .single()

    if (customerError) return { error: customerError.message }
    customer = newCustomer
  }

  // ¿Ya tiene tarjeta en este programa?
  const { data: existingCard } = await supabase
    .from('cards')
    .select('serial')
    .eq('program_id', programId)
    .eq('customer_id', customer!.id)
    .single()

  if (existingCard) return { serial: existingCard.serial }

  const serial = randomBytes(16).toString('hex')

  // OJO: este insert ahora SÍ pide "id" de vuelta con .select('id').single()
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .insert({
      business_id: businessId,
      program_id: programId,
      customer_id: customer!.id,
      serial,
    })
    .select('id')
    .single()

  if (cardError) return { error: cardError.message }

  const { upsertLoyaltyObject } = await import('@/lib/google-wallet')
  try {
    await upsertLoyaltyObject({
      classId: `${process.env.GOOGLE_WALLET_ISSUER_ID}.${programId}`,
      cardId: card.id,
      customerName: name,
      balance: 0,
      rewardText: null,
      serial,
    })
  } catch (err) {
    console.error('No se pudo crear el objeto de Google Wallet:', err)
  }

  return { serial }
}