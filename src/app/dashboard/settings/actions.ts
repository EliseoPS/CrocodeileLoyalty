'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBranding(formData: FormData): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No has iniciado sesión' }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, businesses(name, logo_url)')
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'No tienes negocio' }

  const businessId = membership.business_id
  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses

  const brandColor = formData.get('brandColor') as string
  const newLogoUrl = formData.get('logoUrl') as string | null

  // Si no se subió un logo nuevo, se mantiene el que el negocio ya tenía guardado
  const effectiveLogoUrl = newLogoUrl || business?.logo_url || null

  const updates: { brand: { color: string }; logo_url?: string } = {
    brand: { color: brandColor || '#1a1a1a' },
  }
  if (newLogoUrl) updates.logo_url = newLogoUrl

  const { error: updateError } = await supabase.from('businesses').update(updates).eq('id', businessId)

  if (updateError) return { error: updateError.message }

  const { data: program } = await supabase
    .from('programs')
    .select('id')
    .eq('business_id', businessId)
    .eq('active', true)
    .limit(1)
    .single()

  if (program) {
    try {
      const { ensureLoyaltyClass } = await import('@/lib/google-wallet')
      await ensureLoyaltyClass({
        programId: program.id,
        businessName: business?.name ?? 'Negocio',
        programName: 'Programa de lealtad',
        logoUrl: effectiveLogoUrl || process.env.NEXT_PUBLIC_DEFAULT_LOGO_URL!,
        hexColor: brandColor || '#1a1a1a',
      })
    } catch (err) {
      console.error('No se pudo sincronizar la marca con Google Wallet:', err)
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { success: true }
}