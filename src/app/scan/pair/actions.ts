'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export async function pairDevice(code: string): Promise<{ error: string } | { success: true }> {
  const admin = createAdminClient()

  const { data: device, error } = await admin
    .from('devices')
    .select('id, pairing_expires_at')
    .eq('pairing_code', code.toUpperCase())
    .is('revoked_at', null)
    .single()

  if (error || !device) return { error: 'Código inválido' }

  if (!device.pairing_expires_at || new Date(device.pairing_expires_at) < new Date()) {
    return { error: 'Código expirado, pide uno nuevo al dueño' }
  }

  const token = randomBytes(32).toString('hex')

  const { error: updateError } = await admin
    .from('devices')
    .update({
      token,
      pairing_code: null,
      pairing_expires_at: null,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', device.id)

  if (updateError) return { error: updateError.message }

  const cookieStore = await cookies()
  cookieStore.set('device_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 año
    path: '/',
  })

  return { success: true }
}