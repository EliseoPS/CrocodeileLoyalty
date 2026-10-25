'use client'

import { useState, useEffect } from 'react'
import { login, signup } from './actions'
import { requestPasswordReset } from './forgot-password-actions'
import CrocodeileLogo from '@/components/crocodeile-logo'
import { Check, Circle } from 'lucide-react'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function passwordChecks(value: string) {
  return {
    length: value.length >= 8,
    digit: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  }
}

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.3 5.3A10.6 10.6 0 0112 5c6 0 9.5 6 9.9 7a11 11 0 01-3.2 4.1M6.3 6.3C3.6 8 2.1 10.4 2.1 12c.4 1 2.1 3.6 4.9 5.3M9.3 18.3A10.4 10.4 0 0012 19" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2.1 12S5.6 5 12 5s9.9 7 9.9 7-3.5 7-9.9 7-9.9-7-9.9-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function fieldBorder(touched: boolean, valid: boolean) {
  if (!touched) return 'border-line-strong focus:border-[var(--brand-text)]'
  return valid ? 'border-[var(--accent-text)]' : 'border-[var(--brick)]'
}

const confettiColors = ['var(--brand-text)', 'var(--accent-text)', 'var(--brick)', '#D7E4DC', '#ffffff']

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const emailValid = isValidEmail(email)
  const checks = passwordChecks(password)
  const passwordValid = checks.length && checks.digit && checks.special
  const confirmValid = confirmPassword.length > 0 && confirmPassword === password

const [confetti, setConfetti] = useState<
  { id: number; left: number; delay: number; duration: number; color: string; size: number }[]
>([])

useEffect(() => {
  let cancelled = false

  async function generate() {
    await Promise.resolve()
    if (cancelled) return

    if (!showSuccess) {
      setConfetti([])
      return
    }
    setConfetti(
      Array.from({ length: 16 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 0.9 + Math.random() * 0.6,
        color: confettiColors[i % confettiColors.length],
        size: 6 + Math.random() * 5,
      }))
    )
  }

  generate()
  return () => {
    cancelled = true
  }
}, [showSuccess])

  function dismissSuccess() {
    setShowSuccess(false)
    setMode('login')
    setPassword('')
    setConfirmPassword('')
    setPasswordTouched(false)
    setConfirmTouched(false)
  }



  async function handleSubmit(formData: FormData) {
    setMessage(null)

    if (!isValidEmail(email)) {
      setEmailTouched(true)
      setMessage('Escribe un correo válido.')
      return
    }

    if (mode === 'signup') {
      if (!passwordValid) {
        setPasswordTouched(true)
        setMessage('Tu contraseña aún no cumple los requisitos.')
        return
      }
      if (!confirmValid) {
        setConfirmTouched(true)
        setMessage('Las contraseñas no coinciden.')
        return
      }
    }

    setLoading(true)
    const result = mode === 'login' ? await login(formData) : await signup(formData)

    if (!result.success) {
      setMessage(result.error)
    } else if (mode === 'signup') {
      setShowSuccess(true)
    }
    setLoading(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await requestPasswordReset(forgotEmail)
    if ('error' in result) {
      setMessage(result.error)
    } else {
      setMessage('Si ese correo existe, te enviamos un link para restablecer tu contraseña.')
      setShowForgot(false)
    }
    setLoading(false)
  }

  function backToLogin() {
    setShowForgot(false)
    setMessage(null)
    setForgotEmail('')
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--paper)' }}>
      {/* Panel de marca */}
      <div
        className="relative flex flex-col justify-between md:w-[42%] px-8 py-10 md:px-12 md:py-14 overflow-hidden"
        style={{ background: 'var(--forest)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1.4px, transparent 1.4px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative">
          <CrocodeileLogo size={48} className="mb-6" />
          <h1
            className="text-3xl md:text-4xl font-bold text-white leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Crocodeile
            <br />
            Loyalty
          </h1>
        </div>
        <p className="relative text-sm text-white/70 max-w-xs hidden md:block">
          El panel donde administras tu programa de lealtad, tus sucursales y tus sellos.
        </p>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 md:py-14">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            {showForgot ? 'Recupera tu contraseña' : mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
          </h2>

          {!showForgot ? (
            <>
              <form action={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>
                    Correo
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    maxLength={254}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    className={`w-full rounded-md border bg-surface text-[var(--ink)] px-3 py-2 outline-none transition-colors ${fieldBorder(
                      emailTouched,
                      emailValid
                    )}`}
                    placeholder="tu@negocio.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      maxLength={128}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      className={`w-full rounded-md border bg-surface text-[var(--ink)] px-3 py-2 pr-10 outline-none transition-colors ${
                        mode === 'signup'
                          ? fieldBorder(passwordTouched, passwordValid)
                          : 'border-line-strong focus:border-[var(--brand-text)]'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--ink-soft)' }}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      <EyeIcon off={showPassword} />
                    </button>
                  </div>

                  {mode === 'signup' && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {[
                        { ok: checks.length, label: 'Mínimo 8 caracteres' },
                        { ok: checks.digit, label: 'Al menos un número' },
                        { ok: checks.special, label: 'Al menos un carácter especial' },
                      ].map((item) => (
                        <li
                          key={item.label}
                          className="flex items-center gap-2"
                          style={{ color: item.ok ? 'var(--accent-text)' : 'var(--ink-soft)' }}
                        >
                          {item.ok ? <Check size={14} aria-hidden /> : <Circle size={12} aria-hidden />}
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {mode === 'signup' && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>
                      Repite tu contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        maxLength={128}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setConfirmTouched(true)}
                        className={`w-full rounded-md border bg-surface text-[var(--ink)] px-3 py-2 pr-10 outline-none transition-colors ${fieldBorder(
                          confirmTouched,
                          confirmValid
                        )}`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--ink-soft)' }}
                        aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <EyeIcon off={showConfirm} />
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md py-2.5 font-medium text-white transition-opacity disabled:opacity-60"
                  style={{ background: 'var(--forest)' }}
                >
                  {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
                </button>
              </form>

              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login')
                  setMessage(null)
                }}
                className="mt-4 text-sm"
                style={{ color: 'var(--accent-text)' }}
              >
                {mode === 'login' ? '¿No tienes cuenta? Crea una' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>

              {mode === 'login' && (
                <button
                  onClick={() => {
                    setShowForgot(true)
                    setMessage(null)
                  }}
                  className="block mt-2 text-sm"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  Olvidé mi contraseña
                </button>
              )}
            </>
          ) : (
            <div>
              <button
                onClick={backToLogin}
                className="flex items-center gap-1.5 text-sm mb-4"
                style={{ color: 'var(--ink-soft)' }}
              >
                <ArrowLeftIcon />
                Volver
              </button>
              <form onSubmit={handleForgotPassword} className="space-y-2">
                <label htmlFor="forgotEmail" className="block text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>
                  Correo
                </label>
                <input
                  id="forgotEmail"
                  type="email"
                  maxLength={254}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="tu@negocio.com"
                  required
                  className="w-full rounded-md border border-line-strong bg-surface text-[var(--ink)] px-3 py-2 outline-none focus:border-[var(--brand-text)]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md py-2.5 font-medium text-white"
                  style={{ background: 'var(--moss)' }}
                >
                  {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>
              </form>
            </div>
          )}

          {message && (
            <p className="mt-4 text-sm" style={{ color: 'var(--brick)' }}>
              {message}
            </p>
          )}

          <p className="mt-8 text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
            Al continuar, aceptas nuestros{' '}
            <a href="/legal/terminos" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent-text)' }}>
              Términos y Condiciones
            </a>{' '}
            y nuestro{' '}
            <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent-text)' }}>
              Aviso de Privacidad
            </a>
            .
          </p>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative bg-surface rounded-xl px-10 py-10 flex flex-col items-center text-center shadow-xl overflow-hidden success-pop">
            <div className="confetti-wrap">
              {confetti.map((p) => (
                <span
                  key={p.id}
                  className="confetti-piece"
                  style={{
                    left: `${p.left}%`,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`,
                    background: p.color,
                    width: p.size,
                    height: p.size * 0.4,
                  }}
                />
              ))}
            </div>
            <svg width="56" height="56" viewBox="0 0 56 56" className="relative">
              <circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke="var(--accent-text)"
                strokeWidth="3"
                className="check-circle-ring"
              />
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
            <p
              className="relative mt-4 text-lg font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}
            >
              Cuenta creada
            </p>
            <p className="relative mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
              Ya puedes iniciar sesión.
            </p>
            <button onClick={dismissSuccess} className="relative mt-6 text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
              Continuar
            </button>
          </div>
        </div>
      )}

    </main>
  )
}