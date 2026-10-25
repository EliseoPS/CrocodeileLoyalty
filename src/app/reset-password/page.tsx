'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Circle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CrocodeileLogo from '@/components/crocodeile-logo'
import { PASSWORD_RULES, isPasswordValid, passwordChecks } from '@/lib/password'

function inputClass() {
  return 'w-full rounded-md border border-line-strong bg-surface text-[var(--ink)] px-3 py-2 pr-10 outline-none transition-colors focus:border-[var(--brand-text)]'
}

// Supabase responde en inglés; estos son los casos que un dueño puede ver aquí
function translateError(message: string) {
  if (/session/i.test(message)) return 'El enlace expiró o ya se usó. Pide uno nuevo desde "¿Olvidaste tu contraseña?".'
  if (/different from the old/i.test(message)) return 'La nueva contraseña debe ser distinta a la anterior.'
  return 'No se pudo cambiar la contraseña, intenta de nuevo.'
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const checks = passwordChecks(password)
  const matches = confirm.length > 0 && confirm === password
  const canSubmit = isPasswordValid(password) && matches

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(translateError(error.message))
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--paper)' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <CrocodeileLogo size={44} surface="auto" />
        </div>

        <div className="bg-surface rounded-xl border border-line p-6 md:p-8">
          {done ? (
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
                Contraseña actualizada
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                Entrando a tu panel...
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                Nueva contraseña
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>
                Elige una contraseña nueva para tu cuenta.
              </p>

              <form onSubmit={handleSubmit}>
                <label htmlFor="password" className="block text-sm mb-1.5" style={{ color: 'var(--ink-soft)' }}>
                  Contraseña nueva
                </label>
                <div className="relative mb-2">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    maxLength={72}
                    autoFocus
                    required
                    className={inputClass()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: 'var(--ink-soft)' }}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </button>
                </div>

                <ul className="space-y-1 mb-5 text-xs">
                  {PASSWORD_RULES.map((rule) => (
                    <li
                      key={rule.key}
                      className="flex items-center gap-2"
                      style={{ color: checks[rule.key] ? 'var(--accent-text)' : 'var(--ink-soft)' }}
                    >
                      {checks[rule.key] ? <Check size={14} aria-hidden /> : <Circle size={12} aria-hidden />}
                      {rule.label}
                    </li>
                  ))}
                </ul>

                <label htmlFor="confirm" className="block text-sm mb-1.5" style={{ color: 'var(--ink-soft)' }}>
                  Confirma la contraseña
                </label>
                <input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  maxLength={72}
                  required
                  className={inputClass()}
                  style={confirm && !matches ? { borderColor: 'var(--brick)' } : undefined}
                />
                {confirm && !matches && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--brick)' }}>
                    Las contraseñas no coinciden.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="btn-primary w-full rounded-md py-2.5 font-medium text-white mt-5 disabled:opacity-60"
                >
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </form>

              {error && (
                <p className="mt-4 text-sm text-center" style={{ color: 'var(--brick)' }}>
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
