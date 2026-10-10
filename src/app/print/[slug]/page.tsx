import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import PrintButton from './print-button'

export default async function PrintPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/j/${slug}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(joinUrl)}`

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 40,
      }}
    >
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>{business.name}</h1>
      <p style={{ fontSize: 20, marginBottom: 24 }}>Escanea y obtén tu tarjeta de lealtad</p>
      <img src={qrImageUrl} alt="QR de registro" width={350} height={350} />
      <p style={{ fontSize: 14, color: '#888', marginTop: 24 }}>{joinUrl}</p>

    <PrintButton />

      <style>{`
        @media print {
          .no-print { display: none; }
        }
      `}</style>
    </main>
  )
}