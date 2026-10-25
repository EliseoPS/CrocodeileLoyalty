'use client'

import { useState } from 'react'
import { updateBranding } from './actions'
import { Check } from 'lucide-react'

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const MAX_LOGO_MB = 17
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function inputClass() {
  return 'w-full rounded-md border border-line-strong bg-surface text-[var(--ink)] px-3 py-2 outline-none transition-colors focus:border-[var(--brand-text)]'
}

export default function SettingsForm({
  currentLogoUrl,
  currentColor,
}: {
  currentLogoUrl: string | null
  currentColor: string
}) {
  const [brandColor, setBrandColor] = useState(currentColor)
  const [hexInput, setHexInput] = useState(currentColor)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageOk, setMessageOk] = useState(false)

  function handleColorPicker(value: string) {
    setBrandColor(value)
    setHexInput(value)
  }

  function handleHexInput(value: string) {
    const normalized = value.startsWith('#') ? value : `#${value}`
    setHexInput(normalized)
    if (HEX_REGEX.test(normalized)) setBrandColor(normalized)
  }

  function handleHexBlur() {
    if (!HEX_REGEX.test(hexInput)) setHexInput(brandColor)
  }

  function handleFileChange(file: File | null) {
    setFileError(null)
    if (!file) {
      setLogoFile(null)
      return
    }
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setFileError('Solo se admiten imágenes JPG, PNG o WEBP.')
      setLogoFile(null)
      return
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setFileError(`La imagen supera el máximo de ${MAX_LOGO_MB}MB.`)
      setLogoFile(null)
      return
    }
    setLogoFile(file)
  }

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
        setMessageOk(false)
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
      setMessageOk(false)
    } else {
      setMessage('Guardado. Puede tardar un momento en reflejarse en Google Wallet.')
      setMessageOk(true)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      {currentLogoUrl && (
        <div className="mb-5">
          <p className="text-sm mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            Logo actual
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentLogoUrl} alt="Logo actual" width={72} height={72} className="rounded-lg border border-line object-cover" />
        </div>
      )}

      <div className="mb-5">
        <label className="block text-sm mb-1.5" style={{ color: 'var(--ink-soft)' }}>
          Nuevo logo (déjalo vacío para no cambiarlo)
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <label
            htmlFor="logo-upload"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium cursor-pointer"
            style={{ borderColor: 'var(--brand-text)', color: 'var(--brand-text)' }}
          >
            Elegir imagen
          </label>
          <input
            id="logo-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          {logoFile && !fileError && (
            <span className="text-sm font-medium inline-flex items-center gap-1.5" style={{ color: 'var(--accent-text)' }}>
              <Check size={14} className="flex-shrink-0" aria-hidden />
              Imagen lista: {logoFile.name}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
          Máximo {MAX_LOGO_MB}MB · JPG, PNG o WEBP
        </p>
        {fileError && (
          <p className="mt-1 text-xs" style={{ color: 'var(--brick)' }}>
            {fileError}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm mb-1.5" style={{ color: 'var(--ink-soft)' }}>
          Color de marca
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={brandColor}
            onChange={(e) => handleColorPicker(e.target.value)}
            className="w-11 h-11 rounded-md border border-line-strong cursor-pointer p-0.5"
          />
          <input
            value={hexInput}
            onChange={(e) => handleHexInput(e.target.value)}
            onBlur={handleHexBlur}
            maxLength={7}
            className={`${inputClass()} max-w-[140px] uppercase`}
            placeholder="#1A1A1A"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-md py-2.5 font-medium text-white disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Guardar cambios'}
      </button>

      {message && (
        <p className="mt-4 text-sm" style={{ color: messageOk ? 'var(--accent-text)' : 'var(--brick)' }}>
          {message}
        </p>
      )}
    </form>
    
  )
}