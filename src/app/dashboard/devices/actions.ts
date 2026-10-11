'use server'

import { createClient } from '@/lib/supabase/server'
import { hashToken } from '@/lib/hash'

function randomCode(length: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
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
    pairing_code_hash: hashToken(code),
    pairing_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  })

  if (error) return { error: error.message }

  // El código en texto plano solo se muestra UNA vez, al dueño, en este momento.
  // A partir de aquí, solo existe su hash en la base de datos.
  return { code }
}