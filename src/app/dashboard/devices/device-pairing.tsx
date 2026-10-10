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
    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 16, marginTop: 24 }}>
      <h3>Dispositivos de cajero</h3>
      <p style={{ fontSize: 14, color: '#888' }}>
        Genera un código y captúralo en el celular/tablet que usarás en caja. Válido 15 minutos.
      </p>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generando...' : 'Generar código'}
      </button>
      {code && (
        <p style={{ fontSize: 32, fontWeight: 'bold', letterSpacing: 4, marginTop: 12 }}>{code}</p>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <DeviceList refreshKey={refreshKey} />
    </div>
  )
}