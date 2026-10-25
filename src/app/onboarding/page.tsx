'use client'

import { useState, useEffect } from 'react'
import { createBusiness } from './actions'
import CrocodeileLogo from '@/components/crocodeile-logo'
import { Check, Gift, X } from 'lucide-react'

type ProgramType = 'stamps' | 'stamps_tiers'

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const MAX_LOGO_MB = 17
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Patrón fijo (no aleatorio) para el QR de vista previa — nunca es un QR real
const QR_PATTERN = [
  1, 1, 1, 0, 1, 1, 1,
  1, 0, 1, 0, 1, 0, 1,
  1, 1, 1, 0, 1, 1, 1,
  0, 0, 0, 1, 0, 0, 0,
  1, 1, 0, 0, 1, 1, 1,
  0, 1, 1, 1, 0, 1, 0,
  1, 0, 1, 0, 1, 1, 1,
]

function digitsOnly(value: string, maxDigits: number) {
  return value.replace(/\D/g, '').slice(0, maxDigits)
}

function clamp(value: string, min: number, max: number) {
  const n = Number(value)
  if (Number.isNaN(n) || value === '') return String(min)
  return String(Math.min(max, Math.max(min, n)))
}

function getReadableTextColor(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '#ffffff'
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#17241E' : '#ffffff'
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-sm mb-1.5" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function inputClass() {
  return 'w-full rounded-md border border-line-strong bg-surface text-[var(--ink)] px-3 py-2 outline-none transition-colors focus:border-[var(--brand-text)]'
}

function RadioCard({
  checked,
  onSelect,
  title,
  description,
  name,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  description: string
  name: string
}) {
  return (
    <label
      className="flex items-start gap-3 rounded-md border px-4 py-3 cursor-pointer transition-colors"
      style={{
        borderColor: checked ? 'var(--brand-text)' : 'var(--line-strong)',
        background: checked ? 'var(--accent-soft)' : 'var(--surface)',
      }}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      <span
        className="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
        style={{ borderColor: checked ? 'var(--brand-text)' : 'var(--ink-soft)' }}
      >
        {checked && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--brand-text)' }} />}
      </span>
      <span>
        <span className="block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {title}
        </span>
        <span className="block text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
          {description}
        </span>
      </span>
    </label>
  )
}

function BusinessCardPreview({
  name,
  brandColor,
  logoPreviewUrl,
  programType,
  simpleGoal,
  tiers,
  rewardDescription,
}: {
  name: string
  brandColor: string
  logoPreviewUrl: string | null
  programType: ProgramType
  simpleGoal: string
  tiers: { threshold: number; reward: string }[]
  rewardDescription: string
}) {
  const safeColor = HEX_REGEX.test(brandColor) ? brandColor : '#163a2e'
  const textColor = getReadableTextColor(safeColor)
  const mutedTextStyle = { color: textColor, opacity: 0.65 }

  const dotsTotal =
    programType === 'stamps'
      ? Math.max(1, Number(simpleGoal) || 1)
      : Math.max(1, ...tiers.map((t) => t.threshold || 1))
  const displayDots = Math.min(dotsTotal, 10)
  const extraDots = dotsTotal - displayDots

  return (
    <div
      className="rounded-2xl p-5 shadow-sm"
      style={{ background: safeColor, color: textColor, width: '100%', maxWidth: 280 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ border: `1.5px dashed ${textColor}66` }}
        >
          {logoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreviewUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span style={{ ...mutedTextStyle, fontSize: 11 }}>Logo</span>
          )}
        </div>
        <span className="font-semibold text-sm truncate" style={{ fontFamily: 'var(--font-display)' }}>
          {name.trim() || <span style={mutedTextStyle}>Tu negocio</span>}
        </span>
      </div>

        <div className="mb-5">
          <p className="text-xs mb-2" style={mutedTextStyle}>
            0 visitas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: displayDots }).map((_, i) => (
              <span
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ border: `1.5px solid ${textColor}99` }}
              />
            ))}
            {extraDots > 0 && (
              <span className="text-xs ml-1" style={mutedTextStyle}>
                +{extraDots}
              </span>
            )}
          </div>
        </div>

      {programType === 'stamps' && (
        <p className="text-xs mb-5" style={rewardDescription.trim() ? { color: textColor } : mutedTextStyle}>
          <Gift size={12} className="inline -mt-0.5 mr-1" aria-hidden />
          {rewardDescription.trim() || 'Tu recompensa aparecerá aquí'}
        </p>
      )}

      <div className="bg-white rounded-md p-2 w-16 mx-auto">
        <div className="grid grid-cols-7 gap-[1px]">
          {QR_PATTERN.map((on, i) => (
            <span key={i} style={{ background: on ? '#111' : 'transparent', width: '100%', paddingBottom: '100%' }} />
          ))}
        </div>
      </div>
      <p className="text-[10px] text-center mt-1.5" style={mutedTextStyle}>
        Código del cliente
      </p>
    </div>
    
  )
}

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [programType, setProgramType] = useState<ProgramType>('stamps')
  const [earnMode, setEarnMode] = useState<'per_visit' | 'min_purchase'>('per_visit')
  const [minPurchase, setMinPurchase] = useState('100')
  const [cooldownMinutes, setCooldownMinutes] = useState('60')
  const [rewardDescription, setRewardDescription] = useState('')
  const [tiers, setTiers] = useState([{ threshold: 5, reward: '' }])
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [simpleGoal, setSimpleGoal] = useState('10')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#1a1a1a')
  const [hexInput, setHexInput] = useState('#1a1a1a')

  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null

    async function run() {
      await Promise.resolve()
      if (cancelled) return
      if (!logoFile) {
        setLogoPreviewUrl(null)
        return
      }
      createdUrl = URL.createObjectURL(logoFile)
      setLogoPreviewUrl(createdUrl)
    }

    run()
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [logoFile])

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

  function addTier() {
    setTiers([...tiers, { threshold: 1, reward: '' }])
  }

  function updateTier(index: number, field: 'threshold' | 'reward', value: string) {
    setTiers(
      tiers.map((t, i) => {
        if (i !== index) return t
        if (field === 'threshold') return { ...t, threshold: Number(digitsOnly(value, 2)) || 0 }
        return { ...t, reward: value }
      })
    )
  }

  function clampTierThreshold(index: number) {
    setTiers(tiers.map((t, i) => (i === index ? { ...t, threshold: Math.min(99, Math.max(1, t.threshold)) } : t)))
  }

  function removeTier(index: number) {
    setTiers(tiers.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('name', name)
    formData.set('programType', programType)
    formData.set('earnMode', earnMode)
    formData.set('minPurchase', minPurchase)
    formData.set('cooldownMinutes', cooldownMinutes)
    formData.set('rewardDescription', rewardDescription)
    formData.set('tiers', JSON.stringify(tiers))
    formData.set('simpleGoal', simpleGoal)

    let logoUrl: string | null = null
    if (logoFile) {
      const { uploadBusinessLogo } = await import('./upload-logo')
      const result = await uploadBusinessLogo(logoFile)
      if ('url' in result) logoUrl = result.url
    }

    formData.set('brandColor', brandColor)
    if (logoUrl) formData.set('logoUrl', logoUrl)

    const result = await createBusiness(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:py-12" style={{ background: 'var(--paper)' }}>
      <div className="max-w-5xl mx-auto">
        <CrocodeileLogo size={40} surface="auto" className="mb-6" />

        <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">

          <div className="md:sticky md:top-8 flex flex-col items-center md:items-start">
            <BusinessCardPreview
              name={name}
              brandColor={brandColor}
              logoPreviewUrl={logoPreviewUrl}
              programType={programType}
              simpleGoal={simpleGoal}
              tiers={tiers}
              rewardDescription={rewardDescription}
            />
            <p className="mt-2 text-xs italic" style={{ color: 'var(--ink-soft)' }}>
              Vista previa, acomodo puede variar en cards reales *
            </p>
          </div>

          <div className="bg-surface rounded-xl border border-line p-6 md:p-10">
            <h1
              className="text-2xl font-bold mb-1"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}
            >
              Crea tu negocio
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--ink-soft)' }}>
              Configura tu marca y tu programa de recompensas.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <Field label="Nombre del negocio">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  required
                  className={inputClass()}
                  placeholder="Café Luna"
                />
              </Field>

              <Field label="Color de tu marca">
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
              </Field>

              <Field label="Logo del negocio">
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
              </Field>

              <div className="mb-5">
                <label className="block text-sm mb-2" style={{ color: 'var(--ink-soft)' }}>
                  Tipo de programa de recompensas
                </label>
                <div className="space-y-2">
                  <RadioCard
                    name="programType"
                    checked={programType === 'stamps'}
                    onSelect={() => setProgramType('stamps')}
                    title="Sellos simples"
                    description="Una sola recompensa al llegar a la meta"
                  />
                  <RadioCard
                    name="programType"
                    checked={programType === 'stamps_tiers'}
                    onSelect={() => setProgramType('stamps_tiers')}
                    title="Sellos con niveles"
                    description="Varias recompensas: chica, mediana, grande..."
                  />
                </div>
              </div>

              <>
                  <div className="mb-5">
                    <label className="block text-sm mb-2" style={{ color: 'var(--ink-soft)' }}>
                      ¿Cómo se gana un sello?
                    </label>
                    <div className="space-y-2">
                      <RadioCard
                        name="earnMode"
                        checked={earnMode === 'per_visit'}
                        onSelect={() => setEarnMode('per_visit')}
                        title="Por cada visita"
                        description="El cajero otorga un sello en cada compra"
                      />
                      <RadioCard
                        name="earnMode"
                        checked={earnMode === 'min_purchase'}
                        onSelect={() => setEarnMode('min_purchase')}
                        title="Solo con un monto mínimo"
                        description="La compra debe superar un monto para ganar el sello"
                      />
                    </div>
                  </div>

                  {earnMode === 'min_purchase' && (
                    <Field label="Monto mínimo de compra (MXN)">
                      <input
                        type="number"
                        min={0}
                        max={999999}
                        value={minPurchase}
                        onChange={(e) => setMinPurchase(e.target.value)}
                        onBlur={(e) => setMinPurchase(clamp(e.target.value, 0, 999999))}
                        className={inputClass()}
                      />
                    </Field>
                  )}
              </>

              {programType === 'stamps' && (
                <>
                  <Field label="¿Cada cuántos sellos se gana la recompensa?" hint="Entre 1 y 15">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      value={simpleGoal}
                      onChange={(e) => setSimpleGoal(digitsOnly(e.target.value, 2))}
                      onBlur={(e) => setSimpleGoal(clamp(e.target.value, 1, 15))}
                      className={`${inputClass()} max-w-[90px]`}
                    />
                  </Field>
                  <Field label="Descripción de la recompensa">
                    <input
                      value={rewardDescription}
                      onChange={(e) => setRewardDescription(e.target.value)}
                      maxLength={40}
                      placeholder="Café gratis"
                      className={inputClass()}
                    />
                  </Field>
                </>
              )}

              {programType === 'stamps_tiers' && (
                <div className="mb-5">
                  <label className="block text-sm mb-2" style={{ color: 'var(--ink-soft)' }}>
                    Niveles de recompensa
                  </label>
                  <div className="space-y-2">
                    {tiers.map((tier, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          placeholder="N°"
                          value={tier.threshold || ''}
                          onChange={(e) => updateTier(i, 'threshold', e.target.value)}
                          onBlur={() => clampTierThreshold(i)}
                          style={{ width: 56, flexShrink: 0 }}
                          className={`${inputClass()} text-center px-1`}
                        />
                        <input
                          placeholder="Recompensa"
                          value={tier.reward}
                          onChange={(e) => updateTier(i, 'reward', e.target.value)}
                          maxLength={40}
                          style={{ flex: 1 }}
                          className={inputClass()}
                        />
                        {tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTier(i)}
                            className="rounded-md border border-line-strong w-9 h-9 flex items-center justify-center flex-shrink-0"
                            style={{ color: 'var(--brick)' }}
                            aria-label="Quitar nivel"
                          >
                            <X size={16} aria-hidden />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addTier}
                    className="mt-2 text-sm font-medium"
                    style={{ color: 'var(--accent-text)' }}
                  >
                    + Agregar nivel
                  </button>
                </div>
              )}

              <Field label="Minutos de espera entre sellos (anti-abuso)" hint="Máximo 1000 minutos">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={cooldownMinutes}
                  onChange={(e) => setCooldownMinutes(digitsOnly(e.target.value, 4))}
                  onBlur={(e) => setCooldownMinutes(clamp(e.target.value, 0, 1000))}
                  className={`${inputClass()} max-w-[110px]`}
                />
              </Field>

              <button type="submit" disabled={loading} className="btn-primary w-full rounded-md py-2.5 font-medium text-white disabled:opacity-60 mt-2">
                {loading ? 'Creando...' : 'Crear negocio'}
              </button>

              {error && (
                <p className="mt-4 text-sm" style={{ color: 'var(--brick)' }}>
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}