'use client'

import { useState } from 'react'
import { createBusiness } from './actions'

type ProgramType = 'stamps' | 'stamps_tiers' | 'cashback'

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [programType, setProgramType] = useState<ProgramType>('stamps')
  const [earnMode, setEarnMode] = useState<'per_visit' | 'min_purchase'>('per_visit')
  const [minPurchase, setMinPurchase] = useState('100')
  const [cooldownMinutes, setCooldownMinutes] = useState('60')
  const [rewardDescription, setRewardDescription] = useState('')
  const [cashbackAmount, setCashbackAmount] = useState('1')
  const [cashbackPer, setCashbackPer] = useState('100')
  const [minRedeem, setMinRedeem] = useState('20')
  const [tiers, setTiers] = useState([{ threshold: 5, reward: '' }])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [simpleGoal, setSimpleGoal] = useState('10')
  const [logoFile, setLogoFile] = useState<File | null>(null)
const [brandColor, setBrandColor] = useState('#1a1a1a')

  function addTier() {
    setTiers([...tiers, { threshold: 0, reward: '' }])
  }

  function updateTier(index: number, field: 'threshold' | 'reward', value: string) {
    setTiers(
      tiers.map((t, i) =>
        i === index ? { ...t, [field]: field === 'threshold' ? Number(value) : value } : t
      )
    )
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
    formData.set('cashbackAmount', cashbackAmount)
    formData.set('cashbackPer', cashbackPer)
    formData.set('minRedeem', minRedeem)
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
    // si no hay error, createBusiness ya redirigió a /dashboard
  }

  return (
    <main style={{ padding: 40, maxWidth: 500, margin: '0 auto' }}>
      <h1>Crea tu negocio</h1>
      <form onSubmit={handleSubmit}>
        <label>Nombre del negocio</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 16 }}
        />

        <label>Color de tu marca</label>
        <input
          type="color"
          value={brandColor}
          onChange={(e) => setBrandColor(e.target.value)}
          style={{ width: 60, height: 40, marginBottom: 16, display: 'block' }}
        />

        <label>Logo (cuadrado, ej. 300x300px)</label>
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
          style={{ marginBottom: 16, display: 'block' }}
        />

        <label>Tipo de programa de recompensas</label>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block' }}>
            <input type="radio" checked={programType === 'stamps'} onChange={() => setProgramType('stamps')} />{' '}
            Sellos simples (una sola recompensa al llegar a la meta)
          </label>
          <label style={{ display: 'block' }}>
            <input
              type="radio"
              checked={programType === 'stamps_tiers'}
              onChange={() => setProgramType('stamps_tiers')}
            />{' '}
            Sellos con niveles (varias recompensas: chica, mediana, grande...)
          </label>
          <label style={{ display: 'block' }}>
            <input type="radio" checked={programType === 'cashback'} onChange={() => setProgramType('cashback')} />{' '}
            Cashback (saldo en dinero por cada compra)
          </label>
        </div>

        {(programType === 'stamps' || programType === 'stamps_tiers') && (
          <>
            <label>¿Cómo se gana un sello?</label>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block' }}>
                <input type="radio" checked={earnMode === 'per_visit'} onChange={() => setEarnMode('per_visit')} />{' '}
                Por cada visita
              </label>
              <label style={{ display: 'block' }}>
                <input
                  type="radio"
                  checked={earnMode === 'min_purchase'}
                  onChange={() => setEarnMode('min_purchase')}
                />{' '}
                Solo si la compra supera un monto mínimo
              </label>
            </div>

            {earnMode === 'min_purchase' && (
              <>
                <label>Monto mínimo de compra (MXN)</label>
                <input
                  type="number"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  style={{ width: '100%', padding: 8, marginBottom: 16 }}
                />
              </>
            )}
          </>
        )}

        {programType === 'stamps' && (
          <>
            <label>¿Cada cuántos sellos se gana la recompensa?</label>
            <input
                type="number"
                value={simpleGoal}
                onChange={(e) => setSimpleGoal(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 16 }}
            />
            <label>Descripción de la recompensa</label>
            <input
              value={rewardDescription}
              onChange={(e) => setRewardDescription(e.target.value)}
              placeholder="Ej. Café gratis"
              style={{ width: '100%', padding: 8, marginBottom: 16 }}
            />
          </>
        )}

        {programType === 'stamps_tiers' && (
          <>
            <label>Niveles de recompensa</label>
            {tiers.map((tier, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="number"
                  placeholder="Visitas"
                  value={tier.threshold}
                  onChange={(e) => updateTier(i, 'threshold', e.target.value)}
                  style={{ width: 80, padding: 8 }}
                />
                <input
                  placeholder="Recompensa"
                  value={tier.reward}
                  onChange={(e) => updateTier(i, 'reward', e.target.value)}
                  style={{ flex: 1, padding: 8 }}
                />
                {tiers.length > 1 && (
                  <button type="button" onClick={() => removeTier(i)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addTier} style={{ marginBottom: 16 }}>
              + Agregar nivel
            </button>
          </>
        )}

        {programType === 'cashback' && (
          <>
            <label>¿Cuánto cashback das?</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
              $
              <input
                type="number"
                value={cashbackAmount}
                onChange={(e) => setCashbackAmount(e.target.value)}
                style={{ width: 60, padding: 8 }}
              />
              por cada $
              <input
                type="number"
                value={cashbackPer}
                onChange={(e) => setCashbackPer(e.target.value)}
                style={{ width: 60, padding: 8 }}
              />
              gastados
            </div>

            <label>Mínimo para canjear (MXN)</label>
            <input
              type="number"
              value={minRedeem}
              onChange={(e) => setMinRedeem(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 16 }}
            />
          </>
        )}

        <label>Minutos de espera entre sellos/compras (anti-abuso)</label>
        <input
          type="number"
          value={cooldownMinutes}
          onChange={(e) => setCooldownMinutes(e.target.value)}
          style={{ width: '100%', padding: 8, marginBottom: 16 }}
        />

        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Creando...' : 'Crear negocio'}
        </button>

        {error && <p style={{ color: 'red', marginTop: 16 }}>{error}</p>}
      </form>
    </main>
  )
}