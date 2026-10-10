import { GoogleAuth } from 'google-auth-library'
import jwt from 'jsonwebtoken'

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID!
const CLIENT_EMAIL = process.env.GOOGLE_WALLET_CLIENT_EMAIL!
const PRIVATE_KEY = process.env.GOOGLE_WALLET_PRIVATE_KEY!.replace(/\\n/g, '\n')

const BASE_URL = 'https://walletobjects.googleapis.com/walletobjects/v1'

function getAuthClient() {
  return new GoogleAuth({
    credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })
}

export async function debugGetObject(cardId: string) {
  const objectId = `${ISSUER_ID}.${cardId}`
  const res = await authedFetch(`${BASE_URL}/loyaltyObject/${objectId}`)
  const body = await res.json()
  console.log(JSON.stringify(body, null, 2))
}

async function authedFetch(url: string, options: RequestInit = {}) {
  const auth = getAuthClient()
  const client = await auth.getClient()
  const token = await client.getAccessToken()

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
  })
}

// Lanza un error legible si la respuesta no fue exitosa (y no es un 409 esperado)
async function assertOk(res: Response, context: string) {
  if (res.ok || res.status === 409) return
  const body = await res.text()
  throw new Error(`${context} — HTTP ${res.status}: ${body}`)
}

export async function ensureLoyaltyClass({
    programId,
    businessName,
    programName,
    logoUrl,
    hexColor,
}: {
    programId: string
    businessName: string
    programName: string
    logoUrl: string
    hexColor: string
}) {
  const classId = `${ISSUER_ID}.${programId}`

  const classPayload = {
    id: classId,
    issuerName: businessName,
    programName: programName,
    reviewStatus: 'UNDER_REVIEW',
    hexBackgroundColor: hexColor,
    programLogo: {
      sourceUri: {
        uri: logoUrl,
      },
    },
  }

  const createRes = await authedFetch(`${BASE_URL}/loyaltyClass`, {
    method: 'POST',
    body: JSON.stringify(classPayload),
  })

  if (createRes.status === 409) {
    const updateRes = await authedFetch(`${BASE_URL}/loyaltyClass/${classId}`, {
      method: 'PUT',
      body: JSON.stringify(classPayload),
    })
    await assertOk(updateRes, 'Actualizar Loyalty Class')
  } else {
    await assertOk(createRes, 'Crear Loyalty Class')
  }

  return classId
}

export async function upsertLoyaltyObject({
  classId,
  cardId,
  customerName,
  balance,
  rewardText,
  serial,
}: {
  classId: string
  cardId: string
  customerName: string
  balance: number
  rewardText: string | null
  serial: string
}) {
  const objectId = `${ISSUER_ID}.${cardId}`

  const objectPayload = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    accountName: customerName,
    loyaltyPoints: {
      label: 'Visitas',
      balance: { int: balance },
    },
    barcode: {
      type: 'QR_CODE',
      value: serial,
    },
    textModulesData: rewardText
    ? [{ id: 'reward', header: 'Recompensa disponible', body: rewardText }]
    : [],
  }

  const createRes = await authedFetch(`${BASE_URL}/loyaltyObject`, {
    method: 'POST',
    body: JSON.stringify(objectPayload),
  })

  if (createRes.status === 409) {
    const updateRes = await authedFetch(`${BASE_URL}/loyaltyObject/${objectId}`, {
      method: 'PUT',
      body: JSON.stringify(objectPayload),
    })
    await assertOk(updateRes, 'Actualizar Loyalty Object')
  } else {
    await assertOk(createRes, 'Crear Loyalty Object')
  }

  return objectId
}

export function createSaveToWalletLink(objectId: string): string {
  const payload = {
    iss: CLIENT_EMAIL,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      loyaltyObjects: [{ id: objectId }],
    },
  }

  const token = jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' })
  return `https://pay.google.com/gp/v/save/${token}`
}