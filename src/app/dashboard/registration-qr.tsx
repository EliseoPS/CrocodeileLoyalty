'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check } from 'lucide-react'

export default function RegistrationQr({ slug }: { slug: string }) {
  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/j/${slug}`
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { width: 400, margin: 1 }).then(setQrDataUrl)
  }, [joinUrl])

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        Comparte este código o enlace para que tus clientes se registren.
      </p>

      <div className="flex flex-col items-center">
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="QR de registro" width={160} height={160} />
        )}
        <p className="text-xs mt-3 break-all text-center" style={{ color: 'var(--ink-soft)' }}>
          {joinUrl}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-4">
        <button onClick={copyLink} className="btn-secondary inline-flex items-center gap-1.5">
          {copied && <Check size={14} aria-hidden />}
          {copied ? 'Copiado' : 'Copiar link'}
        </button>
        {qrDataUrl && (
          <a href={qrDataUrl} download={`qr-${slug}.png`}>
            <button type="button" className="btn-secondary">
              Descargar imagen
            </button>
          </a>
        )}
        <a href={`/print/${slug}`} target="_blank" rel="noopener noreferrer">
          <button type="button" className="btn-secondary">
            Ver cartel para imprimir
          </button>
        </a>
      </div>
    </div>
  )
}