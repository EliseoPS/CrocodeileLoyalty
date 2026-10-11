import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit } from '@/lib/rate-limit'

// límites por ruta: intentos permitidos y ventana de tiempo
const EXACT_RULES: Record<string, { limit: number; windowMs: number }> = {
  '/scan/pair': { limit: 5, windowMs: 5 * 60 * 1000 }, // anti fuerza bruta del código
  '/scan': { limit: 30, windowMs: 60 * 1000 }, // dar sellos/canjear, uso normal de caja
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard')) {
    return await updateSession(request)
  }

  let rule = EXACT_RULES[pathname]
  if (!rule && pathname.startsWith('/j/')) {
    rule = { limit: 10, windowMs: 60 * 1000 } // registro de clientes por QR
  }

  if (rule) {
    const ip = getClientIp(request)
    const key = `${ip}:${pathname}`
    const result = checkRateLimit(key, rule.limit, rule.windowMs)

    if (!result.allowed) {
      return new NextResponse('Demasiadas solicitudes, intenta de nuevo en un momento.', {
        status: 429,
        headers: { 'Retry-After': String(result.retryAfterSeconds ?? 60) },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/j/:path*', '/scan/:path*'],
}