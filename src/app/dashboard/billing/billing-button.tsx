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
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Cargando...' : isSubscribed ? 'Administrar suscripción' : 'Suscribirme'}
    </button>
  )
}