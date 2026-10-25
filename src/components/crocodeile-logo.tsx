/* eslint-disable @next/next/no-img-element */

const GREEN = '/logo-crocodeile.webp' // para superficies claras
const WHITE = '/logo-crocodeile-light.webp' // para superficies oscuras

/**
 * Logo de Crocodeile.
 * - surface="dark": siempre blanco (navbars y paneles con fondo --forest, igual en ambos modos).
 * - surface="auto": verde en modo claro y blanco en modo oscuro (sobre --paper / --surface).
 */
export default function CrocodeileLogo({
  size = 32,
  surface = 'dark',
  className,
}: {
  size?: number
  surface?: 'dark' | 'auto'
  className?: string
}) {
  const img = (
    <img
      src={surface === 'dark' ? WHITE : GREEN}
      alt="Crocodeile"
      width={size}
      height={size}
      className={`flex-shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
    />
  )

  if (surface === 'dark') return img

  return (
    <picture className="contents">
      <source srcSet={WHITE} media="(prefers-color-scheme: dark)" />
      {img}
    </picture>
  )
}
