'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { requestPasswordReset } from './forgot-password-actions'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setMessage(null)

    const result = mode === 'login' ? await login(formData) : await signup(formData)

    if (!result.success) {
      setMessage(result.error)
    } else if (mode === 'signup') {
      setMessage('Cuenta creada. Ahora inicia sesión.')
      setMode('login')
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

  return (
    <main style={{ padding: 40, maxWidth: 360, margin: '0 auto' }}>
      <h1>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
      <form action={handleSubmit}>
        <input name="email" type="email" placeholder="Correo" required style={{ width: '100%', padding: 8, marginBottom: 8 }} />
        <input name="password" type="password" placeholder="Contraseña" required style={{ width: '100%', padding: 8, marginBottom: 8 }} />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 8 }}>
          {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
        </button>
        <p style={{ fontSize: 12, color: '#888', marginTop: 16 }}>
          Al continuar, aceptas nuestros{' '}
          <a href="/legal/terminos" target="_blank" rel="noopener noreferrer">Términos y Condiciones</a>{' '}
          y nuestro{' '}
          <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer">Aviso de Privacidad</a>.
        </p>
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ marginTop: 12 }}>
        {mode === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
      {message && <p style={{ marginTop: 16 }}>{message}</p>}
      {mode === 'login' && !showForgot && (
      <button onClick={() => setShowForgot(true)} style={{ marginTop: 8, fontSize: 13 }}>
        Olvidé mi contraseña
      </button>
    )}

    {showForgot && (
      <form onSubmit={handleForgotPassword} style={{ marginTop: 16 }}>
        <input
          type="email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          placeholder="Tu correo"
          required
          style={{ width: '100%', padding: 8, marginBottom: 8 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar link de recuperación'}
        </button>
      </form>
    )}
    </main>
  )
}