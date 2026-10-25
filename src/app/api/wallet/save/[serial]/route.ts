import { redirect } from 'next/navigation'
import { syncWalletPass } from '@/lib/wallet-sync'

// Botón "Agregar a Google Wallet". Antes el link de guardado apuntaba directo a Google con solo
// el ID del pase; si ese pase nunca se creó (p. ej. falló la llamada al registrar al cliente),
// Google respondía "not a valid id". Aquí primero creamos/actualizamos el pase con los datos
// actuales de la tarjeta y luego redirigimos a Google.
export async function GET(_request: Request, { params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params
  if (!/^[0-9a-f]{32}$/.test(serial)) return new Response('Not found', { status: 404 })

  let saveUrl: string
  try {
    const objectId = await syncWalletPass(serial)
    if (!objectId) return new Response('Not found', { status: 404 })
    const { createSaveToWalletLink } = await import('@/lib/google-wallet')
    saveUrl = createSaveToWalletLink(objectId)
  } catch (err) {
    console.error('No se pudo preparar el pase de Google Wallet:', err)
    redirect(`/card/${serial}?wallet=error`)
  }

  redirect(saveUrl)
}
