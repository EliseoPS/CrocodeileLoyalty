// Recompensas pendientes de una tarjeta.
// Se acumulan (nunca se pierden al dar otro sello): `cards.pending_reward` guarda una
// recompensa por línea, en orden de llegada, y `cards.rewards_available` es cuántas hay.
// Se canjean de una en una, la más antigua primero.

const SEPARATOR = '\n'

// Máximo de recompensas guardadas por tarjeta. Al llegar aquí, el sello que completaría
// otra se rechaza hasta que se canjee una (así ninguna se pierde).
export const MAX_PENDING_REWARDS = 5

export function parsePendingRewards(pending: string | null | undefined): string[] {
  return (pending ?? '').split(SEPARATOR).map((r) => r.trim()).filter(Boolean)
}

export function serializePendingRewards(rewards: string[]): string | null {
  return rewards.length ? rewards.join(SEPARATOR) : null
}

// "Café gratis" · "2× Café gratis" · "Café gratis + Postre"
export function formatPendingRewards(pending: string | null | undefined): string | null {
  const rewards = parsePendingRewards(pending)
  if (!rewards.length) return null
  const counts = new Map<string, number>()
  for (const r of rewards) counts.set(r, (counts.get(r) ?? 0) + 1)
  return [...counts].map(([r, n]) => (n > 1 ? `${n}× ${r}` : r)).join(' + ')
}
