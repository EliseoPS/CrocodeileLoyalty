'use client'

import { useRef, useState } from 'react'
import { Camera, Check, Copy, Link2, Share2, X } from 'lucide-react'

// Siempre la URL de producción, aunque se abra desde local o desde otro dominio
const CARD_BASE_URL = 'https://loyalty.crocodeile.com/card'

export default function NoWalletHelp({ serial }: { serial: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const url = `${CARD_BASE_URL}/${serial}`
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  function open() {
    setCanShare(typeof navigator.share === 'function')
    setCopied(false)
    dialogRef.current?.showModal()
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Respaldo para navegadores sin Clipboard API (o sin HTTPS)
      inputRef.current?.select()
      document.execCommand('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function share() {
    try {
      await navigator.share({ title: 'Mi tarjeta de lealtad', url })
    } catch {
      // El usuario canceló el menú de compartir
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="text-sm font-medium underline underline-offset-2"
        style={{ color: 'var(--accent-text)' }}
      >
        ¿No quieres usar tu Wallet?
      </button>

      <dialog
        ref={dialogRef}
        className="no-wallet-dialog bg-surface rounded-2xl p-0 w-[calc(100%-32px)] max-w-sm m-auto shadow-xl"
        style={{ color: 'var(--ink)' }}
        onClick={(e) => {
          // Cerrar al tocar fuera del contenido (el backdrop es parte del <dialog>)
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Usa tu tarjeta sin Wallet
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
              className="-mr-1 -mt-1 p-1 rounded-md"
              style={{ color: 'var(--ink-soft)' }}
            >
              <X size={20} aria-hidden />
            </button>
          </div>

          <div className="flex gap-3 mb-5">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}
            >
              <Camera size={18} strokeWidth={2} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold">Toma una captura de pantalla</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                Muéstrala en caja y el cajero escaneará tu código QR. El código siempre funciona, aunque
                los sellos de la captura no se actualicen.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}
            >
              <Link2 size={18} strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Guarda el enlace de tu tarjeta</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                Ábrelo en tu navegador y guárdalo en favoritos o en tu pantalla de inicio. Ahí verás
                tus sellos siempre al día.
              </p>

              <div className="flex gap-2 mt-3">
                <input
                  ref={inputRef}
                  value={url}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  aria-label="Enlace de tu tarjeta"
                  className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface text-xs px-2.5 py-2 outline-none"
                  style={{ color: 'var(--ink-soft)' }}
                />
                <button
                  type="button"
                  onClick={copy}
                  className="btn-primary rounded-md px-3 py-2 text-xs font-medium text-white flex-shrink-0 inline-flex items-center justify-center gap-1.5"
                  style={{ minWidth: 96 }}
                >
                  {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>

              {canShare && (
                <button
                  type="button"
                  onClick={share}
                  className="btn-secondary w-full mt-2 inline-flex items-center justify-center gap-1.5"
                >
                  <Share2 size={14} aria-hidden />
                  Enviármelo (WhatsApp, correo…)
                </button>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  )
}
