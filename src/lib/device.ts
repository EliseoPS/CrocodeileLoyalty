import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/hash'

export async function getDeviceBusinessId(): Promise<{ businessId: string } | { error: string }> {
  const cookieStore = await cookies()
  const token = cookieStore.get('device_token')?.value

  if (!token) return { error: 'Este dispositivo no está vinculado a ningún negocio' }

  const admin = createAdminClient()
  const { data: device } = await admin
    .from('devices')
    .select('id, business_id, revoked_at')
    .eq('token_hash', hashToken(token))
    .single()

  if (!device || device.revoked_at) return { error: 'Dispositivo no autorizado o revocado' }

  admin.from('devices').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id)

  return { businessId: device.business_id }
}