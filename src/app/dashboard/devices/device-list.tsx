'use client'

import { useEffect, useState, useCallback } from 'react'
import { getDevices, revokeDevice } from './list-actions'

type Device = {
  id: string
  name: string
  token_hash: string | null
  pairing_code_hash: string | null
  pairing_expires_at: string | null
  revoked_at: string | null
  last_seen_at: string | null
  created_at: string
}

function statusOf(device: Device): { label: string; color: string } {
  if (device.revoked_at) return { label: 'Revocado', color: 'var(--ink-soft)' }
  if (device.token_hash) return { label: 'Vinculado', color: 'var(--accent-text)' }
  if (device.pairing_expires_at && new Date(device.pairing_expires_at) > new Date()) {
    return { label: 'Esperando código...', color: 'var(--warn)' }
  }
  return { label: 'Código expirado', color: 'var(--ink-soft)' }
}

export default function DeviceList({ refreshKey }: { refreshKey: number }) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    await Promise.resolve()
    setLoading(true)
    const result = await getDevices()
    if ('devices' in result && result.devices) setDevices(result.devices)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Diferido a una microtarea para no disparar setState síncrono dentro del efecto
    void Promise.resolve().then(load)
  }, [load, refreshKey])

  async function handleRevoke(id: string) {
    if (!confirm('¿Revocar este dispositivo? Dejará de poder dar sellos de inmediato.')) return
    await revokeDevice(id)
    load()
  }

  if (loading) return <p style={{ color: 'var(--ink-soft)' }}>Cargando dispositivos...</p>
  if (devices.length === 0)
    return (
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
        Aún no has vinculado ningún dispositivo.
      </p>
    )

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b border-line">
          <th className="pb-2 font-medium" style={{ color: 'var(--ink-soft)' }}>
            Estado
          </th>
          <th className="pb-2 font-medium" style={{ color: 'var(--ink-soft)' }}>
            Última vez usado
          </th>
          <th className="pb-2"></th>
        </tr>
      </thead>
      <tbody>
        {devices.map((d) => {
          const status = statusOf(d)
          return (
            <tr key={d.id} className="border-b border-line-soft">
              <td className="py-2.5 font-medium" style={{ color: status.color }}>
                {status.label}
              </td>
              <td className="py-2.5" style={{ color: 'var(--ink-soft)' }}>
                {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : '—'}
              </td>
              <td className="py-2.5 text-right">
                {!d.revoked_at && d.token_hash && (
                  <button onClick={() => handleRevoke(d.id)} className="btn-danger-text">
                    Revocar
                  </button>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}