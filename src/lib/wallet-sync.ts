import { loadCardView } from '@/lib/card-view'

// Crea o actualiza el pase de Google Wallet con el estado actual de la tarjeta.
// Único punto de sincronización: registro, sello, canje y el botón "Agregar a Google Wallet"
// usan esta función, así el pase siempre coincide con la tarjeta web (/card/[serial]).
// Lanza si Google responde con error; quien la llama decide si eso bloquea o no.
export async function syncWalletPass(serial: string): Promise<string | null> {
  const view = await loadCardView(serial)
  if (!view) return null

  const { upsertLoyaltyObject } = await import('@/lib/google-wallet')
  return upsertLoyaltyObject({
    classId: `${process.env.GOOGLE_WALLET_ISSUER_ID}.${view.programId}`,
    cardId: view.cardId,
    customerName: view.customerName,
    balance: view.balance,
    goal: view.goal,
    rewardText: view.pendingReward,
    serial: view.serial,
  })
}
