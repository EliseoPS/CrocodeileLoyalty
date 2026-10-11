type Entry = { count: number; resetAt: number }

// Usa globalThis para que el Map sobreviva recargas en caliente (dev) y
// solo exista un contador real durante la vida del proceso.
const g = globalThis as unknown as {
  __rateLimitStore?: Map<string, Entry>
  __rateLimitCleanupStarted?: boolean
}

if (!g.__rateLimitStore) g.__rateLimitStore = new Map()
const store = g.__rateLimitStore

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

// Limpieza periódica para no acumular memoria indefinidamente
if (!g.__rateLimitCleanupStarted) {
  g.__rateLimitCleanupStarted = true
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 5 * 60 * 1000)
}