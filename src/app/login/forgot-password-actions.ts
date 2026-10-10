'use server'

import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(email: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  })

  if (error) return { error: error.message }

  // Por seguridad, siempre decimos "éxito" exista o no el correo (evita revelar qué correos existen)
  return { success: true }
}