import type { Metadata } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import './globals.css'

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
})

const text = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-text',
})

export const metadata: Metadata = {
  title: 'Crocodeile Loyalty',
  description: 'Tarjetas de lealtad virtuales para tu negocio, motiva a tus clientes a regresar',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${text.variable}`}>
      <body className="min-h-full antialiased" style={{ fontFamily: 'var(--font-text)' }}>
        {children}
      </body>
    </html>
  )
}