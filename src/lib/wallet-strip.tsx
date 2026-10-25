import { ImageResponse } from 'next/og'
import type { CardView } from '@/lib/card-view'

// Imagen "hero" del pase de Google Wallet: la franja con los círculos de sellos.
// Google no permite diseño libre en el pase; esta imagen es la única zona que controlamos.
// Tamaño recomendado por Google para heroImage: 1032x336.
export const STRIP_WIDTH = 1032
export const STRIP_HEIGHT = 336

const PAD_X = 48
const PAD_Y = 26
const FOOTER = 30
const GAP = 22

// Oscurece el color de marca para que la franja se distinga del fondo del pase
function shade(hex: string, amount: number) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return hex
  const channel = (i: number) =>
    Math.round(parseInt(full.slice(i, i + 2), 16) * (1 - amount))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(0)}${channel(2)}${channel(4)}`
}

function Stamps({ view }: { view: CardView }) {
  const goal = view.goal ?? 0
  const rows = goal <= 6 ? 1 : 2
  const perRow = Math.ceil(goal / rows)
  const availW = STRIP_WIDTH - PAD_X * 2
  const availH = STRIP_HEIGHT - PAD_Y * 2 - FOOTER
  const size = Math.floor(Math.min((availW - GAP * (perRow - 1)) / perRow, (availH - GAP * (rows - 1)) / rows))
  const { textColor, brandColor, balance } = view

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, alignItems: 'center' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: GAP }}>
          {Array.from({ length: perRow }).map((_, c) => {
            const i = r * perRow + c
            if (i >= goal) return <div key={c} style={{ width: size, height: size }} />
            const filled = i < balance
            const isPrize = i === goal - 1
            return (
              <div
                key={c}
                style={{
                  width: size,
                  height: size,
                  borderRadius: size,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: filled ? textColor : 'transparent',
                  border: filled ? 'none' : `4px ${isPrize ? 'dashed' : 'solid'} ${textColor}${isPrize ? 'b3' : '66'}`,
                }}
              >
                {filled && (
                  <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke={brandColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {!filled && isPrize && (
                  <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="8" width="18" height="4" rx="1" stroke={textColor} strokeWidth="2" />
                    <path d="M12 8v13M19 12v9H5v-9" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path
                      d="M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5"
                      stroke={textColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function BigValue({ value, label, textColor }: { value: string; label: string; textColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
      <span style={{ fontSize: 120, fontWeight: 700, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 30, letterSpacing: 6, color: textColor, opacity: 0.7 }}>{label}</span>
    </div>
  )
}

export function renderWalletStrip(view: CardView) {
  const { textColor, brandColor, balance, goal } = view
  const isDark = textColor === '#ffffff'

  let content: React.ReactNode
  if (view.showCircles) {
    content = <Stamps view={view} />
  } else {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 28 }}>
        <BigValue value={goal ? `${balance}/${goal}` : String(balance)} label="SELLOS" textColor={textColor} />
        {goal && (
          <div style={{ display: 'flex', width: '100%', height: 20, borderRadius: 20, background: `${textColor}33` }}>
            <div
              style={{
                width: `${Math.min((balance / goal) * 100, 100)}%`,
                height: 20,
                borderRadius: 20,
                background: textColor,
              }}
            />
          </div>
        )}
      </div>
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: `${PAD_Y}px ${PAD_X}px`,
          background: shade(brandColor, isDark ? 0.22 : 0.08),
          color: textColor,
        }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{content}</div>
        <div
          style={{
            height: FOOTER,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            fontSize: 20,
            letterSpacing: 1,
            opacity: 0.6,
          }}
        >
          Powered by Crocodeile
        </div>
      </div>
    ),
    {
      width: STRIP_WIDTH,
      height: STRIP_HEIGHT,
      headers: {
        // La URL lleva ?v=<estado>, así que cada cambio de sellos es una URL nueva para Google
        'Cache-Control': 'public, max-age=86400',
      },
    }
  )
}
