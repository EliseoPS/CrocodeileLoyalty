'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

type ProgramType = 'stamps' | 'stamps_tiers' | 'cashback'
type Tier = { threshold: number; reward: string }

export async function createBusiness(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const brandColor = formData.get('brandColor') as string
  const logoUrl = formData.get('logoUrl') as string | null
  if (!user) return { error: 'No has iniciado sesión' }

  const admin = createAdminClient()

  const name = formData.get('name') as string
  const programType = formData.get('programType') as ProgramType
  const earnMode = formData.get('earnMode') as string
  const minPurchase = formData.get('minPurchase') as string
  const cooldownMinutes = formData.get('cooldownMinutes') as string
  const rewardDescription = formData.get('rewardDescription') as string
  const cashbackAmount = formData.get('cashbackAmount') as string
  const cashbackPer = formData.get('cashbackPer') as string
  const minRedeem = formData.get('minRedeem') as string
  const tiersJson = formData.get('tiers') as string | null
  const simpleGoal = formData.get('simpleGoal') as string

  if (!name?.trim()) return { error: 'Falta el nombre del negocio' }

  // Genera un slug único a partir del nombre (ej. "Café Luna" -> "cafe-luna")
  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  let slug = baseSlug
  let attempt = 0
  while (true) {
    const { data: existing } = await admin
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const { data: business, error: businessError } = await admin
    .from('businesses')
    .insert({
      slug,
      name,
      logo_url: logoUrl,
      brand: { color: brandColor || '#1a1a1a' },
      status: 'trial',
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (businessError || !business) return { error: businessError?.message ?? 'Error creando el negocio' }

  const { error: memberError } = await admin.from('business_members').insert({
    business_id: business.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) return { error: memberError.message }

  // Construye las reglas según el tipo de programa elegido
  let rules: Record<string, unknown> = {}
  let type: 'stamps' | 'cashback' = 'stamps'
  let cycleResets = true

  if (programType === 'cashback') {
    type = 'cashback'
    cycleResets = false
    rules = {
      earn_ratio: { cashback: Number(cashbackAmount) || 1, per_spend: Number(cashbackPer) || 100 },
      min_redeem: Number(minRedeem) || 0,
      cooldown_minutes: Number(cooldownMinutes) || 0,
    }
  } else {
    type = 'stamps'
    rules = {
      earn_mode: earnMode === 'min_purchase' ? 'min_purchase' : 'per_visit',
      ...(earnMode === 'min_purchase' ? { min_purchase: Number(minPurchase) || 0 } : {}),
      cooldown_minutes: Number(cooldownMinutes) || 0,
    }
  }

  const { data: program, error: programError } = await admin
    .from('programs')
    .insert({
      business_id: business.id,
      name: 'Programa principal',
      type,
      rules,
      reward_description: rewardDescription || null,
      cycle_resets: cycleResets,
    })
    .select('id')
    .single()

    if (programError || !program) return { error: programError?.message ?? 'Error creando el programa' }
    if (programType === 'stamps' && simpleGoal) {
    const { error: tierError } = await admin.from('program_tiers').insert({
        program_id: program.id,
        threshold: Number(simpleGoal),
        reward: rewardDescription || 'Recompensa',
        sort_order: 1,
    })
    if (tierError) return { error: tierError.message }
    }
    if (programType === 'stamps_tiers' && tiersJson) {
        try {
        const tiers: Tier[] = JSON.parse(tiersJson)
        if (tiers.length > 0) {
            const { error: tiersError } = await admin.from('program_tiers').insert(
            tiers.map((t, i) => ({
                program_id: program.id,
                threshold: t.threshold,
                reward: t.reward,
                sort_order: i + 1,
            }))
            )
            if (tiersError) return { error: tiersError.message }
        }
        } catch {
        return { error: 'Niveles de recompensa inválidos' }
        }
    }

    const { ensureLoyaltyClass } = await import('@/lib/google-wallet')
    try {
      await ensureLoyaltyClass({
        programId: program.id,
        businessName: name,
        programName: 'Programa de lealtad',
        logoUrl: logoUrl || process.env.NEXT_PUBLIC_DEFAULT_LOGO_URL!,
        hexColor: brandColor || '#1a1a1a',
      })
    } catch (err) {
      console.error('No se pudo crear la clase de Google Wallet:', err)
      // No bloqueamos la creación del negocio si esto falla — se puede reintentar después
    }

  redirect('/dashboard')
}