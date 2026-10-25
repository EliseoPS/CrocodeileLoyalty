'use client'

import { useState } from 'react'
import { Gift } from 'lucide-react'
import { giveStamp, redeemReward, getCardStatus } from './actions'
import QrScanner from './qr-scanner'
import { MAX_PENDING_REWARDS } from '@/lib/rewards'

type CardStatus = {
  customerName: string
  balance: number
  goal: number | null
  pendingRewards: string[]
}

const RATE_LIMIT_MESSAGE = 'Demasiadas solicitudes. Espera un momento y vuelve a intentar.'

function sanitizeSerial(value: string) {
  return value.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 32)
}

function inputClass() {
  return 'w-full rounded-md border border-line-strong bg-surface text-[var(--ink)] px-3 py-2 outline-none transition-colors focus:border-[var(--brand-text)]'
}

export default function ScanClient() {
  const [serial, setSerial] = useState('')
  const [status, setStatus] = useState<CardStatus | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageOk, setMessageOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  function showError(text: string) {
    setMessage(text)
    setMessageOk(false)
  }

  async function lookup(value: string) {
    setLoading(true)
    setMessage(null)
    setStatus(null)

    try {
      const res = await getCardStatus({ serial: value })
      if (!res.success) {
        showError(res.error)
      } else {
        setStatus({
          customerName: res.customerName,
          balance: res.balance,
          goal: res.goal,
          pendingRewards: res.pendingRewards,
        })
      }
    } catch {
      // El rate limit del middleware responde 429 sin JSON y llega aquí como excepción
      showError(RATE_LIMIT_MESSAGE)
    }
    setLoading(false)
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (serial.length < 8) return
    await lookup(serial)
  }

  async function handleCameraScan(decodedText: string) {
    const clean = sanitizeSerial(decodedText)
    setSerial(clean)
    setCameraOpen(false)
    await lookup(clean)
  }

  async function handleStamp() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await giveStamp({ serial })
      if (!res.success) {
        showError(res.error)
      } else {
        const progress = res.goal ? `${res.newBalance}/${res.goal}` : String(res.newBalance)
        setMessage(
          `Sello dado (${progress}).` + (res.rewardEarned ? ` ¡Desbloqueó: ${res.rewardEarned}!` : '')
        )
        setMessageOk(true)
        setStatus((prev) =>
          prev && { ...prev, balance: res.newBalance, goal: res.goal, pendingRewards: res.pendingRewards }
        )
      }
    } catch {
      showError(RATE_LIMIT_MESSAGE)
    }
    setLoading(false)
  }

  async function handleRedeem() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await redeemReward({ serial })
      if (!res.success) {
        showError(res.error)
      } else {
        setMessage(`Recompensa canjeada: ${res.redeemedReward}`)
        setMessageOk(true)
        setStatus((prev) => prev && { ...prev, pendingRewards: res.pendingRewards })
      }
    } catch {
      showError(RATE_LIMIT_MESSAGE)
    }
    setLoading(false)
  }

  function reset() {
    setSerial('')
    setStatus(null)
    setMessage(null)
    setCameraOpen(false)
  }

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: 'var(--paper)' }}>
      <div className="max-w-sm mx-auto">
        {!status && (
          <div className="bg-surface rounded-xl border border-line p-6">
            {cameraOpen ? (
              <>
                <div className="rounded-lg overflow-hidden border border-line mb-3">
                  <QrScanner onScan={handleCameraScan} />
                </div>
                <button
                  onClick={() => setCameraOpen(false)}
                  className="text-sm font-medium"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  Cancelar y usar código manual
                </button>
              </>
            ) : (
              <>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--ink-soft)' }}>
                  Código de la tarjeta
                </label>
                <form onSubmit={handleLookup}>
                  <input
                    value={serial}
                    onChange={(e) => setSerial(sanitizeSerial(e.target.value))}
                    placeholder="Pega o escribe el código"
                    maxLength={32}
                    autoFocus
                    required
                    className={`${inputClass()} font-mono text-sm`}
                  />
                  <button
                    type="submit"
                    disabled={loading || serial.length < 8}
                    className="btn-primary w-full rounded-md py-2.5 font-medium text-white mt-3 disabled:opacity-60"
                  >
                    {loading ? 'Buscando...' : 'Buscar tarjeta'}
                  </button>
                </form>

                <div className="flex items-center gap-2 my-4">
                  <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
                  <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                    o
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
                </div>

                <button onClick={() => setCameraOpen(true)} className="btn-secondary w-full">
                  Escanear con cámara
                </button>
              </>
            )}
          </div>
        )}

        {status && (
          <div className="bg-surface rounded-xl border border-line p-6">
            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              Cliente
            </p>
            <p className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              {status.customerName}
            </p>

            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              Sellos
            </p>
            <p
              className="text-2xl font-bold mb-4"
              style={{ color: 'var(--brand-text)', fontFamily: 'var(--font-display)' }}
            >
              {status.goal ? `${status.balance}/${status.goal}` : status.balance}
            </p>

            {status.pendingRewards.length > 0 && (
              <div
                className="rounded-lg p-4 mb-4 border"
                style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-text)' }}
              >
                <div className="flex items-start gap-2.5">
                  <Gift size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-text)' }} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {status.pendingRewards.length === 1
                        ? 'Tiene una recompensa sin canjear'
                        : `Tiene ${status.pendingRewards.length} recompensas sin canjear`}
                    </p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--accent-text)' }}>
                      {status.pendingRewards[0]}
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--ink-soft)' }}>
                      {status.pendingRewards.length >= MAX_PENDING_REWARDS
                        ? `Llegó al máximo de ${MAX_PENDING_REWARDS} recompensas guardadas. Pídele que canjee una para seguir ganando más.`
                        : 'Pregúntale si quiere canjearla ahora. Si solo das el sello, la recompensa se guarda para después.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRedeem}
                  disabled={loading}
                  className="w-full rounded-md py-2.5 font-medium text-white mt-3 disabled:opacity-60"
                  style={{ background: 'var(--moss)' }}
                >
                  Canjear ahora: {status.pendingRewards[0]}
                </button>
              </div>
            )}

            <button
              onClick={handleStamp}
              disabled={loading}
              className="btn-primary w-full rounded-md py-2.5 font-medium text-white disabled:opacity-60"
            >
              {loading ? 'Procesando...' : 'Dar sello'}
            </button>

            <button onClick={reset} className="btn-secondary w-full mt-2">
              Buscar otra tarjeta
            </button>
          </div>
        )}

        {message && (
          <p
            className="mt-4 text-sm text-center"
            style={{ color: messageOk ? 'var(--accent-text)' : 'var(--brick)' }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  )
}