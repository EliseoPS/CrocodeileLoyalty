'use client'

import { useState } from 'react'
import { updateBranding } from './actions'

export default function SettingsForm({
  currentLogoUrl,
  currentColor,
}: {
  currentLogoUrl: string | null
  currentColor: string
}) {
  const [brandColor, setBrandColor] = useState(currentColor)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    let logoUrl: string | null = null
    if (logoFile) {
      const { uploadBusinessLogo } = await import('../../onboarding/upload-logo')
      const result = await uploadBusinessLogo(logoFile)
      if ('error' in result) {
        setMessage(`Error al subir el logo: ${result.error}`)
        setLoading(false)
        return
      }
      logoUrl = result.url
    }

    const formData = new FormData()
    formData.set('brandColor', brandColor)
    if (logoUrl) formData.set('logoUrl', logoUrl)

    const result = await updateBranding(formData)
    if ('error' in result) {
      setMessage(result.error)
    } else {
      setMessage('Guardado. Puede tardar un momento en reflejarse en Google Wallet.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      {currentLogoUrl && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, color: '#888' }}>Logo actual:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentLogoUrl} alt="Logo actual" width={80} height={80} style={{ borderRadius: 8 }} />
        </div>
      )}

      <label>Nuevo logo (dejar vacío para no cambiarlo)</label>
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
        style={{ marginBottom: 16, display: 'block' }}
      />

      <label>Color de marca</label>
      <input
        type="color"
        value={brandColor}
        onChange={(e) => setBrandColor(e.target.value)}
        style={{ width: 60, height: 40, marginBottom: 16, display: 'block' }}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar cambios'}
      </button>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}
    </form>
  )
}