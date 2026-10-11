'use client'

import { useState } from 'react'
import { registerCustomer } from './actions'

export default function RegisterForm({
  businessId,
  programId,
}: {
  businessId: string
  programId: string
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [cardUrl, setCardUrl] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setStatus('loading')
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string

    const result = await registerCustomer({ businessId, programId, name, phone })

    if (result.error) {
      setStatus('error')
    } else {
      setCardUrl(`/card/${result.serial}`)
      setStatus('done')
    }
  }

  if (status === 'done') {
    return (
      <div>
        <p>¡Listo! Tu tarjeta está lista.</p>
        <a href={cardUrl!}>Ver mi tarjeta</a>
      </div>
    )
  }

  return (
    <form action={handleSubmit}>
      <input name="name" placeholder="Tu nombre" required />
      <input name="phone" placeholder="Tu teléfono" required />
      <label>
        <input type="checkbox" required />{' '}
        Acepto el{' '}
        <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer">
          Aviso de Privacidad
        </a>
      </label>
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Registrando...' : 'Obtener mi tarjeta'}
      </button>
      {status === 'error' && <p>Hubo un error, intenta de nuevo.</p>}
    </form>
  )
}