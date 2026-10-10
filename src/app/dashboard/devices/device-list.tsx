'use client'

import { useEffect, useState, useCallback } from 'react'
import { getDevices, revokeDevice } from './list-actions'

type Device = {
  id: string
  name: string
  token: string | null
  pairing_code: string | null
  pairing_expires_at: string | null
  revoked_at: string | null
  last_seen_at: string | null
  created_at: string
}

function statusOf(device: Device): { label: string; color: string } {
  if (device.revoked_at) return { label: 'Revocado', color: '#999' }
  if (device.token) return { label: 'Vinculado', color: 'green' }
  if (device.pairing_expires_at && new Date(device.pairing_expires_at) > new Date()) {
    return { label: 'Esperando código...', color: 'orange' }
  }
  return { label: 'Código expirado', color: '#999' }
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
    load()
  }, [load, refreshKey])

  async function handleRevoke(id: string) {
    if (!confirm('¿Revocar este dispositivo? Dejará de poder dar sellos de inmediato.')) return
    await revokeDevice(id)
    load()
  }

  if (loading) return <p>Cargando dispositivos...</p>
  if (devices.length === 0) return <p style={{ color: '#888' }}>Aún no has vinculado ningún dispositivo.</p>

  return (
    <table style={{ width: '100%', marginTop: 12, fontSize: 14 }}>
      <thead>
        <tr style={{ textAlign: 'left', color: '#888' }}>
          <th>Estado</th>
          <th>Última vez usado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {devices.map((d) => {
          const status = statusOf(d)
          return (
            <tr key={d.id} style={{ borderTop: '1px solid #333' }}>
              <td style={{ color: status.color, padding: '8px 0' }}>{status.label}</td>
              <td>{d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : '—'}</td>
              <td>
                {!d.revoked_at && d.token && (
                  <button onClick={() => handleRevoke(d.id)} style={{ color: 'red' }}>
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