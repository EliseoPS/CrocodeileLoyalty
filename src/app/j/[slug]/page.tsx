import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import RegisterForm from './register-form'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createAdminClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, logo_url')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: program } = await supabase
    .from('programs')
    .select('id, name, reward_description')
    .eq('business_id', business.id)
    .eq('active', true)
    .limit(1)
    .single()

  return (
    <main style={{ padding: 40, maxWidth: 400, margin: '0 auto' }}>
      <h1>{business.name}</h1>
      <p>Regístrate y obtén tu tarjeta: {program?.reward_description}</p>
      <RegisterForm businessId={business.id} programId={program!.id} />
    </main>
  )
}