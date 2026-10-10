'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getDeviceBusinessId } from '@/lib/device'

export async function getCardStatus({ serial }: { serial: string }) {
  const device = await getDeviceBusinessId()
  if ('error' in device) return { error: device.error }

  const supabase = createAdminClient()

  const { data: card, error } = await supabase
    .from('cards')
    .select('business_id, balance, rewards_available, pending_reward, customers(name)')
    .eq('serial', serial)
    .single()

  if (error || !card) return { error: 'Tarjeta no encontrada' }
  if (card.business_id !== device.businessId) return { error: 'Esta tarjeta no pertenece a este negocio' }

  const customer = Array.isArray(card.customers) ? card.customers[0] : card.customers

  return {
    success: true,
    customerName: customer?.name ?? 'Cliente',
    balance: card.balance,
    rewardsAvailable: card.rewards_available,
    pendingReward: card.pending_reward,
  }
}

export async function giveStamp({ serial }: { serial: string }) {
  const device = await getDeviceBusinessId()
  if ('error' in device) return { error: device.error }

  const supabase = createAdminClient()

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('id, business_id, program_id, balance, status, programs(rules, cycle_resets)')
    .eq('serial', serial)
    .single()

  if (cardError || !card) return { error: 'Tarjeta no encontrada' }
  if (card.business_id !== device.businessId) return { ersror: 'Esta tarjeta no pertenece a este negocio' }
  if (card.status !== 'active') return { error: 'Tarjeta bloqueada' }

  const { data: business } = await supabase
  .from('businesses')
  .select('status')
  .eq('id', card.business_id)
  .single()

  if (business?.status === 'suspended' || business?.status === 'canceled') {
    return { error: 'El servicio de este negocio está suspendido por falta de pago' }
  }



  const program = Array.isArray(card.programs) ? card.programs[0] : card.programs
  const rules = program?.rules as { cooldown_minutes?: number } | undefined

  if (rules?.cooldown_minutes) {
    const { data: lastTx } = await supabase
      .from('transactions')
      .select('created_at')
      .eq('card_id', card.id)
      .eq('type', 'earn')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastTx) {
      const minutesSince = (Date.now() - new Date(lastTx.created_at).getTime()) / 60000
      if (minutesSince < rules.cooldown_minutes) {
        return { error: `Espera ${Math.ceil(rules.cooldown_minutes - minutesSince)} min para dar otro sello` }
      }
    }
  }

  const { data: tiers } = await supabase
    .from('program_tiers')
    .select('threshold, reward')
    .eq('program_id', card.program_id)
    .order('threshold', { ascending: true })

  const newBalance = Number(card.balance) + 1
  const highestTier = tiers?.[tiers.length - 1]
  const reachedTier = tiers?.find((t) => t.threshold === newBalance)

  let finalBalance = newBalance
  const rewardsAvailable = reachedTier ? 1 : 0

  if (program?.cycle_resets && highestTier && newBalance >= highestTier.threshold) {
    finalBalance = 0
  }

  const { error: txError } = await supabase.from('transactions').insert({
    business_id: card.business_id,
    card_id: card.id,
    type: 'earn',
    units_delta: 1,
  })

  if (txError) return { error: txError.message }

  const { error: updateError } = await supabase
    .from('cards')
    .update({
      balance: finalBalance,
      rewards_available: rewardsAvailable,
      pending_reward: reachedTier?.reward ?? null,
      last_visit_at: new Date().toISOString(),
    })
    .eq('id', card.id)

  if (updateError) return { error: updateError.message }

  // Sincroniza el cambio con Google Wallet (si falla, no bloquea la respuesta al cajero)
try {
  const { upsertLoyaltyObject } = await import('@/lib/google-wallet')
  const { data: cardWithCustomer } = await supabase
    .from('cards')
    .select('serial, customers(name)')
    .eq('id', card.id)
    .single()

  const customer = Array.isArray(cardWithCustomer?.customers)
    ? cardWithCustomer.customers[0]
    : cardWithCustomer?.customers

  console.log('Enviando a Google Wallet — reward:', reachedTier?.reward, 'balance:', finalBalance)
  await upsertLoyaltyObject({
    classId: `${process.env.GOOGLE_WALLET_ISSUER_ID}.${card.program_id}`,
    cardId: card.id,
    customerName: customer?.name ?? 'Cliente',
    balance: finalBalance,
    rewardText: reachedTier?.reward ?? null,
    serial: cardWithCustomer!.serial,
  })

  } catch (err) {
    console.error('No se pudo sincronizar con Google Wallet:', err)
  }

  return {
    success: true,
    newBalance: finalBalance,
    rewardEarned: reachedTier?.reward ?? null,
  }
}

export async function redeemReward({ serial }: { serial: string }) {
  const device = await getDeviceBusinessId()
  if ('error' in device) return { error: device.error }

  const supabase = createAdminClient()

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('id, business_id, rewards_available, pending_reward')
    .eq('serial', serial)
    .single()

  if (cardError || !card) return { error: 'Tarjeta no encontrada' }
  if (card.business_id !== device.businessId) return { error: 'Esta tarjeta no pertenece a este negocio' }
  if (card.rewards_available <= 0 || !card.pending_reward) {
    return { error: 'Esta tarjeta no tiene recompensa disponible' }
  }

  const { error: redemptionError } = await supabase.from('redemptions').insert({
    business_id: card.business_id,
    card_id: card.id,
    reward: card.pending_reward,
  })

  if (redemptionError) return { error: redemptionError.message }

  await supabase.from('transactions').insert({
    business_id: card.business_id,
    card_id: card.id,
    type: 'redeem',
    units_delta: 0,
  })

  const { error: updateError } = await supabase
    .from('cards')
    .update({ rewards_available: 0, pending_reward: null })
    .eq('id', card.id)

  if (updateError) return { error: updateError.message }

  try {
  const { upsertLoyaltyObject } = await import('@/lib/google-wallet')
  const { data: cardFull } = await supabase
    .from('cards')
    .select('serial, program_id, balance, customers(name)')
    .eq('id', card.id)
    .single()

  const customer = Array.isArray(cardFull?.customers) ? cardFull.customers[0] : cardFull?.customers

  await upsertLoyaltyObject({
    classId: `${process.env.GOOGLE_WALLET_ISSUER_ID}.${cardFull!.program_id}`,
    cardId: card.id,
    customerName: customer?.name ?? 'Cliente',
    balance: cardFull!.balance,
    rewardText: null,
    serial: cardFull!.serial,
  })
  } catch (err) {
    console.error('No se pudo sincronizar con Google Wallet:', err)
  }

  return { success: true, redeemedReward: card.pending_reward }
}