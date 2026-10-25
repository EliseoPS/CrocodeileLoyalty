'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { pairDevice } from './actions'
import CrocodeileLogo from '@/components/crocodeile-logo'

function ExitIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PairPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await pairDevice(code)

      if ('error' in result) {
        setError(result.error)
        setLoading(false)
      } else {
        router.push('/scan')
      }
    } catch {
      setError('Demasiados intentos. Espera unos minutos y vuelve a intentar.')
      setLoading(false)
    }
  }

  return (
    <>
      <nav className="px-4 py-3" style={{ background: 'var(--forest)' }}>
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CrocodeileLogo size={32} />
            <span className="text-white font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Crocodeile
            </span>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="nav-icon-btn"
            aria-label="Salir"
            title="Salir"
          >
            <ExitIcon />
          </button>
        </div>
      </nav>

      <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--paper)' }}>
        <div className="w-full max-w-sm bg-surface rounded-xl border border-line p-6 md:p-8">
          <h1
            className="text-xl font-bold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}
          >
            Vincular este dispositivo
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>
            Pide el código de 6 caracteres al dueño del negocio.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="------"
              maxLength={6}
              required
              autoFocus
              className="w-full rounded-md border bg-surface text-[var(--ink)] outline-none transition-colors focus:border-[var(--brand-text)]"
              style={{
                borderColor: error ? 'var(--brick)' : 'var(--line-strong)',
                padding: '14px 12px',
                marginBottom: 16,
                fontSize: 28,
                fontFamily: 'var(--font-display)',
                textAlign: 'center',
                letterSpacing: 8,
              }}
            />
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="btn-primary w-full rounded-md py-2.5 font-medium text-white disabled:opacity-60"
            >
              {loading ? 'Vinculando...' : 'Vincular'}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-center" style={{ color: 'var(--brick)' }}>
              {error}
            </p>
          )}

          <p className="mt-6 text-xs text-center" style={{ color: 'var(--ink-soft)' }}>
            El código lo genera el dueño desde su panel y es válido por 15 minutos.
          </p>
        </div>
      </main>
    </>
  )
}