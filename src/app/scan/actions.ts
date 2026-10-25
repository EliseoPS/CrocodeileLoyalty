'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getDeviceBusinessId } from '@/lib/device'
import { MAX_PENDING_REWARDS, parsePendingRewards, serializePendingRewards } from '@/lib/rewards'
import { syncWalletPass } from '@/lib/wallet-sync'

export type CardStatusResult =
  | { success: false; error: string }
  | { success: true; customerName: string; balance: number; goal: number | null; pendingRewards: string[] }

export type StampResult =
  | { success: false; error: string }
  | { success: true; newBalance: number; goal: number | null; rewardEarned: string | null; pendingRewards: string[] }

export type RedeemResult =
  | { success: false; error: string }
  | { success: true; redeemedReward: string; pendingRewards: string[] }

type Tier = { threshold: number; reward: string }

function nextGoal(tiers: Tier[] | null, balance: number) {
  return (tiers?.find((t) => t.threshold > balance) ?? tiers?.[tiers.length - 1])?.threshold ?? null
}

async function getTiers(programId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('program_tiers')
    .select('threshold, reward')
    .eq('program_id', programId)
    .order('threshold', { ascending: true })
  return (data ?? []) as Tier[]
}

// Si Google falla no bloquea al cajero: el pase se reintenta en el siguiente movimiento
async function syncWalletQuietly(serial: string) {
  try {
    await syncWalletPass(serial)
  } catch (err) {
    console.error('No se pudo sincronizar con Google Wallet:', err)
  }
}

export async function getCardStatus({ serial }: { serial: string }): Promise<CardStatusResult> {
  const device = await getDeviceBusinessId()
  if ('error' in device) return { success: false, error: device.error }

  const supabase = createAdminClient()

  const { data: card } = await supabase
    .from('cards')
    .select('business_id, program_id, balance, rewards_available, pending_reward, customers(name)')
    .eq('serial', serial)
    .single()

  if (!card) return { success: false, error: 'Tarjeta no encontrada' }
  if (card.business_id !== device.businessId) {
    return { success: false, error: 'Esta tarjeta no pertenece a este negocio' }
  }

  const customer = Array.isArray(card.customers) ? card.customers[0] : card.customers
  const balance = Number(card.balance)

  return {
    success: true,
    customerName: customer?.name ?? 'Cliente',
    balance,
    goal: nextGoal(await getTiers(card.program_id), balance),
    pendingRewards: card.rewards_available > 0 ? parsePendingRewards(card.pending_reward) : [],
  }
}

export async function giveStamp({ serial }: { serial: string }): Promise<StampResult> {
  const device = await getDeviceBusinessId()
  if ('error' in device) return { success: false, error: device.error }

  const supabase = createAdminClient()

  const { data: card } = await supabase
    .from('cards')
    .select('id, business_id, program_id, balance, status, rewards_available, pending_reward, programs(rules, cycle_resets)')
    .eq('serial', serial)
    .single()

  if (!card) return { success: false, error: 'Tarjeta no encontrada' }
  if (card.business_id !== device.businessId) {
    return { success: false, error: 'Esta tarjeta no pertenece a este negocio' }
  }
  if (card.status !== 'active') return { success: false, error: 'Tarjeta bloqueada' }

  const { data: business } = await supabase.from('businesses').select('status').eq('id', card.business_id).single()

  if (business?.status === 'suspended' || business?.status === 'canceled') {
    return { success: false, error: 'El servicio de este negocio está suspendido por falta de pago' }
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
      .maybeSingle()

    if (lastTx) {
      const minutesSince = (Date.now() - new Date(lastTx.created_at).getTime()) / 60000
      if (minutesSince < rules.cooldown_minutes) {
        return {
          success: false,
          error: `Espera ${Math.ceil(rules.cooldown_minutes - minutesSince)} min para dar otro sello`,
        }
      }
    }
  }

  const tiers = await getTiers(card.program_id)
  const newBalance = Number(card.balance) + 1
  const highestTier = tiers[tiers.length - 1]
  const reachedTier = tiers.find((t) => t.threshold === newBalance)

  const finalBalance = program?.cycle_resets && highestTier && newBalance >= highestTier.threshold ? 0 : newBalance

  // Las recompensas sin canjear se conservan; la nueva (si la hay) se suma a la fila
  const pendingRewards = card.rewards_available > 0 ? parsePendingRewards(card.pending_reward) : []
  if (reachedTier && pendingRewards.length >= MAX_PENDING_REWARDS) {
    return {
      success: false,
      error: `Tiene ${MAX_PENDING_REWARDS} recompensas sin canjear (el máximo). Canjea una antes de dar este sello.`,
    }
  }
  if (reachedTier) pendingRewards.push(reachedTier.reward)

  // Condicionado al saldo leído: si otro dispositivo dio un sello al mismo tiempo, no se pisa
  const { data: updated, error: updateError } = await supabase
    .from('cards')
    .update({
      balance: finalBalance,
      rewards_available: pendingRewards.length,
      pending_reward: serializePendingRewards(pendingRewards),
      last_visit_at: new Date().toISOString(),
    })
    .eq('id', card.id)
    .eq('balance', card.balance)
    .select('id')

  if (updateError) {
    console.error('No se pudo actualizar la tarjeta:', updateError)
    return { success: false, error: 'No se pudo dar el sello, intenta de nuevo' }
  }
  if (!updated?.length) return { success: false, error: 'La tarjeta cambió mientras tanto, búscala de nuevo' }

  const { error: txError } = await supabase.from('transactions').insert({
    business_id: card.business_id,
    card_id: card.id,
    type: 'earn',
    units_delta: 1,
  })
  if (txError) console.error('Sello dado pero no se registró en el historial:', txError)

  await syncWalletQuietly(serial)

  return {
    success: true,
    newBalance: finalBalance,
    goal: nextGoal(tiers, finalBalance),
    rewardEarned: reachedTier?.reward ?? null,
    pendingRewards,
  }
}

// Canjea UNA recompensa (la más antigua). Si tenía varias acumuladas, las demás se conservan.
export async function redeemReward({ serial }: { serial: string }): Promise<RedeemResult> {
  const device = await getDeviceBusinessId()
  if ('error' in device) return { success: false, error: device.error }

  const supabase = createAdminClient()

  const { data: card } = await supabase
    .from('cards')
    .select('id, business_id, rewards_available, pending_reward')
    .eq('serial', serial)
    .single()

  if (!card) return { success: false, error: 'Tarjeta no encontrada' }
  if (card.business_id !== device.businessId) {
    return { success: false, error: 'Esta tarjeta no pertenece a este negocio' }
  }

  const pendingRewards = card.rewards_available > 0 ? parsePendingRewards(card.pending_reward) : []
  const redeemed = pendingRewards.shift()
  if (!redeemed) return { success: false, error: 'Esta tarjeta no tiene recompensa disponible' }

  // Condicionado a lo leído: un doble toque no puede canjear la misma recompensa dos veces
  const { data: updated, error: updateError } = await supabase
    .from('cards')
    .update({
      rewards_available: pendingRewards.length,
      pending_reward: serializePendingRewards(pendingRewards),
    })
    .eq('id', card.id)
    .eq('rewards_available', card.rewards_available)
    .select('id')

  if (updateError) {
    console.error('No se pudo canjear la recompensa:', updateError)
    return { success: false, error: 'No se pudo canjear, intenta de nuevo' }
  }
  if (!updated?.length) return { success: false, error: 'Esta recompensa ya se canjeó' }

  const { error: redemptionError } = await supabase.from('redemptions').insert({
    business_id: card.business_id,
    card_id: card.id,
    reward: redeemed,
  })
  if (redemptionError) console.error('Canje hecho pero no se registró:', redemptionError)

  await supabase.from('transactions').insert({
    business_id: card.business_id,
    card_id: card.id,
    type: 'redeem',
    units_delta: 0,
  })

  await syncWalletQuietly(serial)

  return { success: true, redeemedReward: redeemed, pendingRewards }
}
