import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('businesses').select('*')

  return (
    <main style={{ padding: 40 }}>
      <h1>Conexión a Supabase</h1>
      <p>
        {error
          ? `Error: ${error.message}`
          : `OK — ${data?.length} negocios encontrados (0 es normal, aún no creas ninguno)`}
      </p>
    </main>
  )
}