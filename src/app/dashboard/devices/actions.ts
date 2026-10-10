'use server'

import { createClient } from '@/lib/supabase/server'

function randomCode(length: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin caracteres confusos (0/O, 1/I)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function generatePairingCode(): Promise<{ error: string } | { code: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No has iniciado sesión' }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'No tienes negocio' }

  const code = randomCode(6)

  const { error } = await supabase.from('devices').insert({
    business_id: membership.business_id,
    pairing_code: code,
    pairing_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
  })

  if (error) return { error: error.message }

  return { code }
}