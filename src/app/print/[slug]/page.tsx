import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import PrintButton from './print-button'
import QRCode from 'qrcode'
import DashboardNavbar from '@/app/dashboard/navbar'

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
  const qrDataUrl = await QRCode.toDataURL(joinUrl, { width: 500, margin: 1 })

  return (
    <>
      <div className="no-print" style={{ background: 'var(--paper)' }}>
        <DashboardNavbar businessName={business.name} />
        <div className="max-w-3xl mx-auto px-4 py-3">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: 'var(--ink-soft)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver al panel
          </a>
        </div>
      </div>

      <main
        className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-16"
        style={{ background: 'var(--paper)' }}
      >
        <h1
          className="text-4xl font-bold mb-2"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}
        >
          {business.name}
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--ink-soft)' }}>
          Escanea y obtén tu tarjeta de lealtad
        </p>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR de registro" width={350} height={350} />
        </div>

        <p className="text-sm mt-6 break-all" style={{ color: 'var(--ink-soft)' }}>
          {joinUrl}
        </p>

        <div className="no-print mt-8">
          <PrintButton />
        </div>
      </main>

      <style>{`
        @media print {
          .no-print { display: none; }
        }
      `}</style>
    </>
  )
}