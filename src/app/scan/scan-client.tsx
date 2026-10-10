'use client'

import { useState } from 'react'
import { giveStamp, redeemReward, getCardStatus } from './actions'
import QrScanner from './qr-scanner'

type CardStatus = {
  customerName: string
  balance: number
  rewardsAvailable: number
  pendingReward: string | null
}

export default function ScanPage() {
  const [serial, setSerial] = useState('')
  const [status, setStatus] = useState<CardStatus | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera')

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setStatus(null)

    const res = await getCardStatus({ serial })

    if (res.error) {
      setMessage(`❌ ${res.error}`)
    } else {
      setStatus({
        customerName: res.customerName!,
        balance: res.balance!,
        rewardsAvailable: res.rewardsAvailable!,
        pendingReward: res.pendingReward!,
      })
    }
    setLoading(false)
  }
  async function handleCameraScan(decodedText: string) {
  setSerial(decodedText)
  setLoading(true)
  setMessage(null)
  setStatus(null)

  const res = await getCardStatus({ serial: decodedText })

  if (res.error) {
    setMessage(`❌ ${res.error}`)
  } else {
    setStatus({
      customerName: res.customerName!,
      balance: res.balance!,
      rewardsAvailable: res.rewardsAvailable!,
      pendingReward: res.pendingReward!,
    })
  }
  setLoading(false)
}

  async function handleStamp() {
    setLoading(true)
    const res = await giveStamp({ serial })
    if (res.error) {
      setMessage(`❌ ${res.error}`)
    } else {
      setMessage(
        `✅ Sello dado. Nuevo saldo: ${res.newBalance}` +
          (res.rewardEarned ? ` — 🎉 ¡Recompensa desbloqueada: ${res.rewardEarned}!` : '')
      )
      const refreshed = await getCardStatus({ serial })
      if (refreshed.success) {
        setStatus({
          customerName: refreshed.customerName!,
          balance: refreshed.balance!,
          rewardsAvailable: refreshed.rewardsAvailable!,
          pendingReward: refreshed.pendingReward!,
        })
      }
    }
    setLoading(false)
  }

  async function handleRedeem() {
    setLoading(true)
    const res = await redeemReward({ serial })
    if (res.error) {
      setMessage(`❌ ${res.error}`)
    } else {
      setMessage(`🎁 Recompensa canjeada: ${res.redeemedReward}`)
      setStatus((prev) => prev && { ...prev, rewardsAvailable: 0, pendingReward: null })
    }
    setLoading(false)
  }

  function reset() {
    setSerial('')
    setStatus(null)
    setMessage(null)
  }

  return (
    <main style={{ padding: 40, maxWidth: 400, margin: '0 auto' }}>
      <h1>Escáner de cajero</h1>

      {!status && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => setScanMode('camera')}
              style={{ flex: 1, padding: 8, fontWeight: scanMode === 'camera' ? 'bold' : 'normal' }}
            >
              📷 Cámara
            </button>
            <button
              onClick={() => setScanMode('manual')}
              style={{ flex: 1, padding: 8, fontWeight: scanMode === 'manual' ? 'bold' : 'normal' }}
            >
              ⌨️ Manual
            </button>
          </div>

          {scanMode === 'camera' ? (
            <QrScanner onScan={handleCameraScan} />
          ) : (
            <form onSubmit={handleLookup}>
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Pega aquí el serial de la tarjeta"
                autoFocus
                required
                style={{ width: '100%', padding: 8, marginBottom: 8 }}
              />
              <button type="submit" disabled={loading} style={{ width: '100%', padding: 8 }}>
                {loading ? 'Buscando...' : 'Buscar tarjeta'}
              </button>
            </form>
          )}
        </>
      )}

      {status && (
        <div style={{ border: '1px solid #333', borderRadius: 8, padding: 16 }}>
          <p>Cliente: {status.customerName}</p>
          <p>Saldo actual: {status.balance}</p>
          {status.rewardsAvailable > 0 && (
            <p style={{ color: 'green' }}>Recompensa disponible: {status.pendingReward}</p>
          )}

          <button onClick={handleStamp} disabled={loading} style={{ width: '100%', padding: 8, marginTop: 8 }}>
            {loading ? 'Procesando...' : 'Dar sello'}
          </button>

          {status.rewardsAvailable > 0 && (
            <button
              onClick={handleRedeem}
              disabled={loading}
              style={{ width: '100%', padding: 8, marginTop: 8, background: '#2a7' }}
            >
              Canjear recompensa
            </button>
          )}

          <button onClick={reset} style={{ width: '100%', padding: 8, marginTop: 8 }}>
            Buscar otra tarjeta
          </button>
        </div>
      )}

      {message && <p style={{ marginTop: 16 }}>{message}</p>}
    </main>
  )
}