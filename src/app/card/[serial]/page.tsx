import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { loadCardView } from '@/lib/card-view'
import NoWalletHelp from './no-wallet-help'
import { Gift } from 'lucide-react'

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GiftIcon({ color }: { color: string }) {
  return (
    <svg width="38%" height="38%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M19 12v9H5v-9" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ serial: string }>
  searchParams: Promise<{ wallet?: string }>
}) {
  const { serial } = await params
  const { wallet } = await searchParams
  const card = await loadCardView(serial)
  if (!card) notFound()

  const { brandColor, textColor, balance, goal, remaining, showCircles } = card
  const isDarkCard = textColor === '#ffffff'
  const muted = { color: textColor, opacity: 0.7 }
  const label = 'text-[11px] uppercase tracking-[0.18em]'

  const qrDataUrl = await QRCode.toDataURL(card.serial, { width: 360, margin: 1 })

  // Pasa por nuestra ruta para crear/actualizar el pase antes de mandar a Google
  const googleWalletEnabled = Boolean(process.env.GOOGLE_WALLET_ISSUER_ID)

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden"
      style={{ background: 'var(--paper)' }}
    >
      <div className="relative w-full max-w-sm">
        {/* Halo del color de marca detrás de la tarjeta */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[70%] rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: brandColor }}
        />

        <div className="relative text-center mb-6">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            Hola, {card.customerName}
          </p>
          <h1
            className="text-2xl font-bold mt-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}
          >
            Tu tarjeta de lealtad
          </h1>
        </div>

        {/* La tarjeta */}
        <div
          className="card-enter relative rounded-[28px] overflow-hidden shadow-2xl"
          style={{ background: brandColor, color: textColor }}
        >
          {/* Encabezado: logo + nombre */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
              {card.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.logoUrl} alt={card.businessName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold" style={{ color: brandColor, fontFamily: 'var(--font-display)' }}>
                  {card.businessName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="font-bold text-xl truncate" style={{ fontFamily: 'var(--font-display)' }}>
              {card.businessName}
            </span>
          </div>

          {/* Franja con saldo y sellos */}
          <div
            className="px-5 py-5"
            style={{
              backgroundColor: isDarkCard ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)',
              backgroundImage: `radial-gradient(${textColor}14 1.5px, transparent 1.5px)`,
              backgroundSize: '22px 22px',
            }}
          >
            <>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-5xl font-bold leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                    {goal ? `${balance}/${goal}` : balance}
                  </span>
                  <span className={label} style={muted}>
                    Sellos
                  </span>
                </div>

                {showCircles ? (
                  <div className="grid grid-cols-5 gap-2.5">
                    {Array.from({ length: goal ?? 0 }).map((_, i) => {
                      const filled = i < balance
                      const isPrize = i === (goal ?? 0) - 1
                      return (
                        <div
                          key={i}
                          className="aspect-square rounded-full flex items-center justify-center"
                          style={
                            filled
                              ? { background: textColor }
                              : {
                                  border: `2px ${isPrize ? 'dashed' : 'solid'} ${textColor}${isPrize ? 'b3' : '66'}`,
                                }
                          }
                        >
                          {filled ? (
                            <CheckIcon color={brandColor} />
                          ) : (
                            isPrize && <GiftIcon color={`${textColor}d9`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  goal && (
                    <div className="h-2.5 rounded-full" style={{ background: `${textColor}33` }}>
                      <div
                        className="h-2.5 rounded-full"
                        style={{ background: textColor, width: `${Math.min((balance / goal) * 100, 100)}%` }}
                      />
                    </div>
                  )
                )}
            </>
          </div>

          {/* Campos */}
          <div className="flex justify-between gap-4 px-5 pt-5">
            <div className="min-w-0">
              <p className={label} style={muted}>
                Miembro
              </p>
              <p className="text-lg font-semibold truncate mt-0.5">{card.customerName}</p>
            </div>
            <div className="text-right min-w-0">
              <p className={label} style={muted}>
                Próximo premio
              </p>
              <p className="text-lg font-semibold truncate mt-0.5">
                {remaining === 0 ? '¡Lo lograste!' : `${remaining} sello${remaining === 1 ? '' : 's'} más`}
              </p>
            </div>
          </div>

          {card.pendingReward && (
            <div
              className="mx-5 mt-4 rounded-xl px-4 py-3 flex items-center gap-2.5"
              style={{ background: `${textColor}1f` }}
            >
              <Gift size={20} className="flex-shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className={label} style={muted}>
                  Recompensa disponible
                </p>
                <p className="text-sm font-semibold">{card.pendingReward}</p>
              </div>
            </div>
          )}

          {/* QR */}
          <div className="flex justify-center px-5 pt-5">
            <div className="bg-white rounded-2xl p-3 w-44 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Código del cliente" className="w-full" />
              <p className="text-center text-[10px] uppercase tracking-[0.18em] mt-1.5" style={{ color: '#5b6b63' }}>
                Muestra en caja
              </p>
            </div>
          </div>

          {/* Powered by */}
          <div className="flex items-center justify-center gap-1.5 pt-4 pb-4" style={{ color: textColor, opacity: 0.55 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isDarkCard ? '/logo-crocodeile-light.webp' : '/logo-crocodeile.webp'}
              alt=""
              width={14}
              height={14}
              style={{ width: 14, height: 14 }}
            />
            <span className="text-[11px] tracking-wide">Powered by Crocodeile</span>
          </div>
        </div>

        {/* Google Wallet, fuera de la tarjeta */}
        {googleWalletEnabled && (
          <div className="relative flex justify-center mt-6">
            <a href={`/api/wallet/save/${card.serial}`} rel="nofollow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/esES_add_to_google_wallet_add-wallet-badge.svg" alt="Agregar a Google Wallet" />
            </a>
          </div>
        )}

        {wallet === 'error' && (
          <p className="relative mt-3 text-sm text-center" style={{ color: 'var(--brick)' }}>
            No pudimos preparar tu pase de Google Wallet. Intenta de nuevo en unos minutos o usa la
            versión web.
          </p>
        )}

        <div className="relative flex justify-center mt-4">
          <NoWalletHelp serial={card.serial} />
        </div>
      </div>
    </main>
  )
}
