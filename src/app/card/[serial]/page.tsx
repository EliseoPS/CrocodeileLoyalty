import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'

export default async function CardPage({
  params,
}: {
  params: Promise<{ serial: string }>
}) {
  const { serial } = await params
  const supabase = createAdminClient()

  const { data: card } = await supabase
    .from('cards')
    .select(
      `
      id,
      balance,
      rewards_available,
      pending_reward,
      serial,
      customers ( name ),
      programs ( name, reward_description, rules, cycle_resets, type ),
      businesses ( name, logo_url, brand  )
    `
    )
    .eq('serial', serial)
    .single()

  if (!card) notFound()

  const customer = Array.isArray(card.customers) ? card.customers[0] : card.customers
  const program = Array.isArray(card.programs) ? card.programs[0] : card.programs
  const business = Array.isArray(card.businesses) ? card.businesses[0] : card.businesses

  let googleWalletLink: string | null = null
  try {
    const { createSaveToWalletLink } = await import('@/lib/google-wallet')
    const objectId = `${process.env.GOOGLE_WALLET_ISSUER_ID}.${card.id}`
    googleWalletLink = createSaveToWalletLink(objectId)
  } catch {
    googleWalletLink = null
  }
  const qrDataUrl = await QRCode.toDataURL(card.serial, { width: 300, margin: 1 })
  
  return (
    <main style={{ padding: 40, maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
      {business?.logo_url && (
        <img src={business.logo_url} alt={business.name} width={60} height={60} style={{ borderRadius: 8, marginBottom: 8 }} />
      )}
      <h1>{business?.name}</h1>
      <p>Hola, {customer?.name}</p>

      <div style={{ border: `2px solid ${business?.brand?.color || '#333'}`, borderRadius: 16, padding: 24, margin: '24px 0' }}>
        <h2>{program?.name}</h2>
        <p style={{ fontSize: 32, fontWeight: 'bold' }}>{card.balance}</p>
        <p>visitas acumuladas</p>
        {card.rewards_available > 0 && (
          <p style={{ color: 'green' }}>
            ¡Tienes una recompensa disponible: {card.pending_reward}!
          </p>
        )}
      </div>

      {/* El QR que el cajero va a escanear para dar el sello */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="Tu código QR" style={{ margin: '0 auto' }} />
      <p style={{ fontSize: 12, color: '#888' }}>Muestra este código en caja</p>

      {googleWalletLink && (
        <a href={googleWalletLink} target="_blank" rel="noopener noreferrer">
          <img
            src="/esES_add_to_google_wallet_add-wallet-badge.svg"
            alt="Agregar a Google Wallet"
            style={{ marginTop: 16 }}
          />
        </a>
      )}
    </main>
  )
}