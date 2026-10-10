'use client'

export default function RegistrationQr({ slug }: { slug: string }) {
  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/j/${slug}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(joinUrl)}`

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl)
    alert('Link copiado')
  }

  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 16, marginTop: 24 }}>
      <h3>QR de registro de clientes</h3>
      <img src={qrImageUrl} alt="QR de registro" width={160} height={160} />
      <p style={{ fontSize: 14, wordBreak: 'break-all', color: '#888' }}>{joinUrl}</p>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={copyLink}>Copiar link</button>
        <a href={qrImageUrl} download={`qr-${slug}.png`}>
          <button type="button">Descargar imagen</button>
        </a>
        <a href={`/print/${slug}`} target="_blank" rel="noopener noreferrer">
          <button type="button">Ver cartel para imprimir</button>
        </a>
      </div>
    </div>
  )
}