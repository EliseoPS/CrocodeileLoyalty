'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

type ProgramType = 'stamps' | 'stamps_tiers'
type Tier = { threshold: number; reward: string }

const MAX_SIMPLE_GOAL = 15
const MAX_TIER_THRESHOLD = 99
const MAX_TIERS = 10

// Valida y normaliza los niveles que llegan del navegador (no confiar en el input del cliente)
function parseTiers(json: string | null): Tier[] | null {
  try {
    const raw = JSON.parse(json ?? '[]') as unknown
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TIERS) return null
    const tiers = raw.map((t) => ({
      threshold: Math.trunc(Number((t as Tier)?.threshold)),
      reward: String((t as Tier)?.reward ?? '').trim().slice(0, 40),
    }))
    const valid = tiers.every((t) => t.threshold >= 1 && t.threshold <= MAX_TIER_THRESHOLD && t.reward)
    const unique = new Set(tiers.map((t) => t.threshold)).size === tiers.length
    if (!valid || !unique) return null
    return tiers.sort((a, b) => a.threshold - b.threshold)
  } catch {
    return null
  }
}

export async function createBusiness(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No has iniciado sesión' }

  const admin = createAdminClient()

  // Un dueño = un negocio. Evita duplicados por doble clic o por volver a /onboarding.
  const { data: existingMembership } = await admin
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (existingMembership) redirect('/dashboard')

  const name = ((formData.get('name') as string) ?? '').trim().slice(0, 60)
  const brandColor = (formData.get('brandColor') as string) || '#1a1a1a'
  const logoUrl = (formData.get('logoUrl') as string | null) || null
  const programType = formData.get('programType') as ProgramType
  const earnMode = formData.get('earnMode') as string
  const minPurchase = formData.get('minPurchase') as string
  const cooldownMinutes = formData.get('cooldownMinutes') as string
  const rewardDescription = ((formData.get('rewardDescription') as string) ?? '').trim().slice(0, 40)
  const simpleGoal = Math.trunc(Number(formData.get('simpleGoal')))

  if (!name) return { error: 'Falta el nombre del negocio' }

  // Niveles del programa, validados antes de crear nada
  let tiers: Tier[]
  if (programType === 'stamps_tiers') {
    const parsed = parseTiers(formData.get('tiers') as string | null)
    if (!parsed) {
      return { error: 'Revisa los niveles: cada uno necesita un número de sellos distinto (1-99) y una recompensa.' }
    }
    tiers = parsed
  } else {
    if (!(simpleGoal >= 1 && simpleGoal <= MAX_SIMPLE_GOAL)) {
      return { error: `La meta de sellos debe estar entre 1 y ${MAX_SIMPLE_GOAL}.` }
    }
    if (!rewardDescription) return { error: 'Describe la recompensa que ganará el cliente.' }
    tiers = [{ threshold: simpleGoal, reward: rewardDescription }]
  }

  // Genera un slug único a partir del nombre (ej. "Café Luna" -> "cafe-luna")
  const baseSlug =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'negocio'

  let slug = baseSlug
  let attempt = 0
  while (true) {
    const { data: existing } = await admin.from('businesses').select('id').eq('slug', slug).maybeSingle()
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
      brand: { color: brandColor },
      status: 'trial',
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (businessError || !business) {
    console.error('No se pudo crear el negocio:', businessError)
    return { error: 'No se pudo crear el negocio, intenta de nuevo.' }
  }

  // Si algo falla después de crear el negocio, se borra todo lo creado: un negocio sin programa
  // dejaría al dueño atorado (ya no podría volver a /onboarding y su QR de registro no serviría).
  async function rollback(context: string, err: unknown) {
    console.error(`${context}; deshaciendo el alta del negocio:`, err)
    const { data: programs } = await admin.from('programs').select('id').eq('business_id', business!.id)
    const programIds = (programs ?? []).map((p) => p.id)
    if (programIds.length) await admin.from('program_tiers').delete().in('program_id', programIds)
    await admin.from('programs').delete().eq('business_id', business!.id)
    await admin.from('business_members').delete().eq('business_id', business!.id)
    await admin.from('businesses').delete().eq('id', business!.id)
    return { error: 'No se pudo crear el negocio, intenta de nuevo.' }
  }

  const { error: memberError } = await admin.from('business_members').insert({
    business_id: business.id,
    user_id: user.id,
    role: 'owner',
  })
  if (memberError) return rollback('No se pudo asignar al dueño', memberError)

  // Solo existen programas de sellos (simples o con niveles)
  const rules = {
    earn_mode: earnMode === 'min_purchase' ? 'min_purchase' : 'per_visit',
    ...(earnMode === 'min_purchase' ? { min_purchase: Math.max(0, Number(minPurchase) || 0) } : {}),
    cooldown_minutes: Math.min(1000, Math.max(0, Number(cooldownMinutes) || 0)),
  }

  const { data: program, error: programError } = await admin
    .from('programs')
    .insert({
      business_id: business.id,
      name: 'Programa principal',
      type: 'stamps',
      rules,
      reward_description: programType === 'stamps' ? rewardDescription : tiers[0].reward,
      cycle_resets: true,
    })
    .select('id')
    .single()
  if (programError || !program) return rollback('No se pudo crear el programa', programError)

  const { error: tiersError } = await admin.from('program_tiers').insert(
    tiers.map((t, i) => ({
      program_id: program.id,
      threshold: t.threshold,
      reward: t.reward,
      sort_order: i + 1,
    }))
  )
  if (tiersError) return rollback('No se pudieron crear los niveles', tiersError)

  try {
    const { ensureLoyaltyClass } = await import('@/lib/google-wallet')
    await ensureLoyaltyClass({
      programId: program.id,
      businessName: name,
      programName: 'Programa de lealtad',
      logoUrl: logoUrl || process.env.NEXT_PUBLIC_DEFAULT_LOGO_URL!,
      hexColor: brandColor,
    })
  } catch (err) {
    // No bloquea el alta: la clase se vuelve a sincronizar al guardar la marca en settings
    console.error('No se pudo crear la clase de Google Wallet:', err)
  }

  redirect('/dashboard')
}
