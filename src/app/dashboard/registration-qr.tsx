'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function RegistrationQr({ slug }: { slug: string }) {
  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/j/${slug}`
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { width: 400, margin: 1 }).then(setQrDataUrl)
  }, [joinUrl])

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl)
    alert('Link copiado')
  }

  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 16, marginTop: 24 }}>
      <h3>QR de registro de clientes</h3>
      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="QR de registro" width={160} height={160} />
      )}
      <p style={{ fontSize: 14, wordBreak: 'break-all', color: '#888' }}>{joinUrl}</p>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={copyLink}>Copiar link</button>
        {qrDataUrl && (
          <a href={qrDataUrl} download={`qr-${slug}.png`}>
            <button type="button">Descargar imagen</button>
          </a>
        )}
        <a href={`/print/${slug}`} target="_blank" rel="noopener noreferrer">
          <button type="button">Ver cartel para imprimir</button>
        </a>
      </div>
    </div>
  )
}