'use client'

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary rounded-md px-6 py-2.5 font-medium text-white">
      Imprimir
    </button>
  )
}