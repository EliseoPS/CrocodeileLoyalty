import { loadCardView } from '@/lib/card-view'
import { renderWalletStrip } from '@/lib/wallet-strip'

// Pública a propósito: Google descarga esta imagen desde sus servidores para pintar el pase.
// Solo expone el progreso de sellos; el serial (32 hex aleatorios) no es adivinable.
export async function GET(_request: Request, { params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params
  if (!/^[0-9a-f]{32}$/.test(serial)) return new Response('Not found', { status: 404 })

  const view = await loadCardView(serial)
  if (!view) return new Response('Not found', { status: 404 })

  try {
    return renderWalletStrip(view)
  } catch (err) {
    console.error('No se pudo generar la imagen del pase:', err)
    return new Response('Error', { status: 500 })
  }
}
