'use client'

import { createClient } from '@/lib/supabase/client'

export async function uploadBusinessLogo(file: File): Promise<{ error: string } | { url: string }> {
  const supabase = createClient()
  const fileName = `${Date.now()}-${file.name}`

  const { error } = await supabase.storage.from('business-logos').upload(fileName, file)
  if (error) return { error: error.message }

  const { data } = supabase.storage.from('business-logos').getPublicUrl(fileName)
  return { url: data.publicUrl }
}