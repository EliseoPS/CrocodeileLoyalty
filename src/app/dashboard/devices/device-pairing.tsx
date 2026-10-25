'use client'

import { useState } from 'react'
import { generatePairingCode } from './actions'
import DeviceList from './device-list'

export default function DevicePairing() {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const result = await generatePairingCode()
    if ('error' in result) {
      setError(result.error)
    } else {
      setCode(result.code)
      setRefreshKey((k) => k + 1)
    }
    setLoading(false)
  }

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        Genera un código y captúralo en el celular/tablet que usarás en caja. Válido 15 minutos.
      </p>
      <button onClick={handleGenerate} disabled={loading} className="btn-primary rounded-md px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
        {loading ? 'Generando...' : 'Generar código'}
      </button>

      {code && (
        <p
          className="text-3xl font-bold tracking-widest mt-4"
          style={{ color: 'var(--brand-text)', fontFamily: 'var(--font-display)' }}
        >
          {code}
        </p>
      )}
      {error && (
        <p className="text-sm mt-2" style={{ color: 'var(--brick)' }}>
          {error}
        </p>
      )}

      <div className="mt-6">
        <DeviceList refreshKey={refreshKey} />
      </div>
    </div>
  )
}