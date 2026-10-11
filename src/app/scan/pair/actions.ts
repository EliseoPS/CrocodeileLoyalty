'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { hashToken } from '@/lib/hash'

export async function pairDevice(code: string): Promise<{ error: string } | { success: true }> {
  const admin = createAdminClient()

  const { data: device, error } = await admin
    .from('devices')
    .select('id, pairing_expires_at')
    .eq('pairing_code_hash', hashToken(code.toUpperCase()))
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
      token_hash: hashToken(token),
      pairing_code_hash: null,
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
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  return { success: true }
}