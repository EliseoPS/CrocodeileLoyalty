import { createAdminClient } from '@/lib/supabase/admin'
import { formatPendingRewards } from '@/lib/rewards'

// Datos de una tarjeta listos para pintarse. Lo comparten la tarjeta web (/card/[serial])
// y la imagen de Google Wallet (/api/wallet/strip/[serial]) para que siempre coincidan.

export const MAX_STAMP_CIRCLES = 15

export function getReadableTextColor(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '#ffffff'
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#17241E' : '#ffffff'
}

export async function loadCardView(serial: string) {
  const supabase = createAdminClient()

  const { data: card } = await supabase
    .from('cards')
    .select(
      `
      id, balance, rewards_available, pending_reward, serial, program_id,
      customers ( name ),
      programs ( name, type ),
      businesses ( name, logo_url, brand )
    `
    )
    .eq('serial', serial)
    .single()

  if (!card) return null

  const customer = Array.isArray(card.customers) ? card.customers[0] : card.customers
  const program = Array.isArray(card.programs) ? card.programs[0] : card.programs
  const business = Array.isArray(card.businesses) ? card.businesses[0] : card.businesses

  const { data: tiers } = await supabase
    .from('program_tiers')
    .select('threshold, reward')
    .eq('program_id', card.program_id)
    .order('threshold', { ascending: true })

  const brandColor = (business?.brand as { color?: string } | null)?.color || '#163a2e'
  const balance = Number(card.balance)

  const nextTier = tiers?.find((t) => t.threshold > balance) ?? tiers?.[tiers.length - 1] ?? null
  const goal = nextTier?.threshold ?? null
  const remaining = goal ? Math.max(goal - balance, 0) : 0

  return {
    cardId: card.id as string,
    programId: card.program_id as string,
    serial: card.serial as string,
    customerName: (customer?.name as string | undefined) ?? 'Cliente',
    businessName: (business?.name as string | undefined) ?? '',
    logoUrl: (business?.logo_url as string | null | undefined) ?? null,
    programName: (program?.name as string | undefined) ?? '',
    // Texto listo para mostrar: "Café gratis", "2× Café gratis", "Café gratis + Postre"
    pendingReward: card.rewards_available > 0 ? formatPendingRewards(card.pending_reward as string | null) : null,
    brandColor,
    textColor: getReadableTextColor(brandColor),
    balance,
    goal,
    remaining,
    showCircles: goal !== null && goal <= MAX_STAMP_CIRCLES,
  }
}

export type CardView = NonNullable<Awaited<ReturnType<typeof loadCardView>>>
