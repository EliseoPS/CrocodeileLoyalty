'use client'

import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const containerId = 'qr-reader'
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const hasScannedRef = useRef(false)
  const isRunningRef = useRef(false)

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner
    hasScannedRef.current = false
    let cancelled = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          if (hasScannedRef.current) return
          hasScannedRef.current = true
          onScan(decodedText)
        },
        () => {
          // se llama constantemente mientras no detecta nada — se ignora a propósito
        }
      )
      .then(() => {
        if (cancelled) {
          // El componente ya se desmontó mientras la cámara arrancaba: detenla de inmediato
          scanner.stop().catch(() => {})
        } else {
          isRunningRef.current = true
        }
      })
      .catch((err) => {
        console.error('No se pudo iniciar la cámara', err)
      })

    return () => {
      cancelled = true
      if (isRunningRef.current) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
        isRunningRef.current = false
      }
    }
  }, [onScan])

  return <div id={containerId} style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }} />
}