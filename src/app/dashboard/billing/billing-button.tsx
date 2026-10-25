'use client'

import { useState } from 'react'
import { createCheckoutSession, createPortalSession } from './actions'

export default function BillingButton({ status }: { status: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const result = status === 'active' || status === 'past_due' ? await createPortalSession() : await createCheckoutSession()

    if ('url' in result) {
      window.location.href = result.url
    } else {
      alert(result.error)
      setLoading(false)
    }
  }

  const isSubscribed = status === 'active' || status === 'past_due'

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        {isSubscribed
          ? 'Administra tu método de pago, tus facturas o cancela tu suscripción.'
          : 'Suscríbete para seguir usando el servicio al terminar tu periodo de prueba.'}
      </p>
      <button onClick={handleClick} disabled={loading} className="btn-primary rounded-md px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
        {loading ? 'Cargando...' : isSubscribed ? 'Administrar suscripción' : 'Suscribirme'}
      </button>
    </div>
  )
}