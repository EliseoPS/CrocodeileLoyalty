'use client'

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="no-print" style={{ marginTop: 32, padding: '10px 20px' }}>
      Imprimir
    </button>
  )
}