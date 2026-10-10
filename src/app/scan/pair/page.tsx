'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { pairDevice } from './actions'

export default function PairPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await pairDevice(code)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/scan')
    }
  }

  return (
    <main style={{ padding: 40, maxWidth: 360, margin: '0 auto' }}>
      <h1>Vincular este dispositivo</h1>
      <p>Pide el código de 6 caracteres al dueño del negocio.</p>
      <form onSubmit={handleSubmit}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Código"
          maxLength={6}
          required
          style={{
            width: '100%',
            padding: 12,
            marginBottom: 8,
            fontSize: 28,
            textAlign: 'center',
            letterSpacing: 6,
          }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Vinculando...' : 'Vincular'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: 16 }}>{error}</p>}
    </main>
  )
}