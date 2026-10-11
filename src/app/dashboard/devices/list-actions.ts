'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getDevices() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No has iniciado sesión' }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'No tienes negocio' }

  const { data: devices, error } = await supabase
    .from('devices')
    .select('id, name, token_hash, pairing_code_hash, pairing_expires_at, revoked_at, last_seen_at, created_at')
    .eq('business_id', membership.business_id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  return { devices }
}

export async function revokeDevice(deviceId: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No has iniciado sesión' }

  // RLS confirma que el dispositivo pertenece a un negocio del que eres miembro
  const { error } = await supabase
    .from('devices')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', deviceId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}