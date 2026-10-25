'use client'

import { useState } from 'react'
import { registerCustomer } from './actions'

const NAME_MAX = 60
const PHONE_LENGTH = 10

function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label htmlFor={htmlFor} className="block text-sm mb-1.5" style={{ color: 'var(--ink-soft)' }}>
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

export default function RegisterForm({
  businessId,
  programId,
}: {
  businessId: string
  programId: string
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('Hubo un error, intenta de nuevo.')
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [phoneError, setPhoneError] = useState(false)

  const canSubmit = name.trim().length > 0 && phone.length === PHONE_LENGTH && accepted

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('loading')

    try {
      const result = await registerCustomer({ businessId, programId, name: name.trim(), phone })

      if (!result.success) {
        setErrorMessage(result.error)
        setPhoneError(result.code === 'duplicate' || result.code === 'invalid_phone')
        setStatus('error')
      } else {
        setCardUrl(`/card/${result.serial}`)
        setStatus('done')
      }
    } catch {
      setErrorMessage('Demasiados intentos. Espera un minuto y vuelve a intentar.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="success-pop flex flex-col items-center text-center py-2">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="26" fill="none" stroke="var(--accent-text)" strokeWidth="3" className="check-circle-ring" />
          <path
            d="M17 29l7 7 15-15"
            fill="none"
            stroke="var(--accent-text)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="check-mark"
          />
        </svg>
        <p className="mt-4 text-lg font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          ¡Listo! Tu tarjeta está lista.
        </p>
        <a
          href={cardUrl!}
          className="btn-primary mt-6 w-full rounded-md py-2.5 font-medium text-white text-center block"
        >
          Ver mi tarjeta
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Tu nombre" htmlFor="name">
        <input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
          placeholder="Ana López"
          autoComplete="name"
          maxLength={NAME_MAX}
          required
          className={inputClass()}
        />
      </Field>

      <Field label="Tu teléfono" htmlFor="phone" hint="10 dígitos, sin lada internacional.">
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, '').slice(0, PHONE_LENGTH))
            if (phoneError) {
              setPhoneError(false)
              setStatus('idle')
            }
          }}
          aria-invalid={phoneError}
          placeholder="5512345678"
          maxLength={PHONE_LENGTH}
          pattern="[0-9]{10}"
          required
          className={inputClass()}
          style={phoneError ? { borderColor: 'var(--brick)' } : undefined}
        />
      </Field>

      <label className="flex items-start gap-2.5 mb-6 text-sm" style={{ color: 'var(--ink)' }}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 flex-shrink-0"
          style={{ accentColor: 'var(--brand-text)' }}
        />
        <span>
          Acepto el{' '}
          <a
            href="/legal/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--accent-text)' }}
          >
            Aviso de Privacidad
          </a>
        </span>
      </label>

      <button
        type="submit"
        disabled={status === 'loading' || !canSubmit}
        className="btn-primary w-full rounded-md py-2.5 font-medium text-white disabled:opacity-60"
      >
        {status === 'loading' ? 'Registrando...' : 'Obtener mi tarjeta'}
      </button>

      {status === 'error' && (
        <p className="mt-4 text-sm text-center" style={{ color: 'var(--brick)' }}>
          {errorMessage}
        </p>
      )}
    </form>
  )
}
