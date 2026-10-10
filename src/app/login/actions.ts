'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type AuthResult = { success: true } | { success: false; error: string }

export async function login(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { success: false, error: error.message }

  redirect('/dashboard')
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { success: false, error: error.message }

  // Supabase no da error si el correo ya existe (por seguridad, evita revelar qué correos
  // están registrados) — pero sí regresa un array de "identities" vacío en ese caso.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return {
      success: false,
      error: 'Ese correo ya tiene una cuenta. Inicia sesión en vez de crear una nueva.',
    }
  }

  return { success: true }
}