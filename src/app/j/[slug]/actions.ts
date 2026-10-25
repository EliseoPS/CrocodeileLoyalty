'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'
// /max: metadatos completos (rangos reales por lada). Solo corre en servidor, no pesa en el navegador.
import { isValidPhoneNumber } from 'libphonenumber-js/max'
import { syncWalletPass } from '@/lib/wallet-sync'

export type RegisterResult =
  | { success: false; error: string; code?: 'duplicate' | 'invalid_phone' }
  | { success: true; serial: string }

const GENERIC_ERROR = 'Hubo un error, intenta de nuevo.'

export async function registerCustomer({
  businessId,
  programId,
  name,
  phone,
}: {
  businessId: string
  programId: string
  name: string
  phone: string
}): Promise<RegisterResult> {
  // Validación en servidor: los límites del input se pueden saltar desde el navegador
  name = (name ?? '').trim()
  phone = (phone ?? '').replace(/\D/g, '')
  if (!name || name.length > 60) return { success: false, error: 'Escribe un nombre válido.' }
  if (phone.length !== 10) {
    return { success: false, code: 'invalid_phone', error: 'El teléfono debe tener 10 dígitos.' }
  }
  // Valida que la lada y el rango existan en México (no comprueba que la línea esté activa)
  if (!isValidPhoneNumber(phone, 'MX')) {
    return {
      success: false,
      code: 'invalid_phone',
      error: 'Ese número no parece válido. Revisa que sean los 10 dígitos con tu lada.',
    }
  }

  const supabase = createAdminClient()

  // businessId/programId vienen del navegador: confirmar que el programa es de ese negocio y está activo
  const { data: programInfo } = await supabase
    .from('programs')
    .select('id')
    .eq('id', programId)
    .eq('business_id', businessId)
    .eq('active', true)
    .single()

  if (!programInfo) return { success: false, error: GENERIC_ERROR }

  // Busca si ya existe un cliente con ese teléfono en este negocio
  let { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .single()

  if (!customer) {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({ business_id: businessId, name, phone, consent_at: new Date().toISOString() })
      .select('id')
      .single()

    if (customerError) {
      console.error('No se pudo crear el cliente:', customerError)
      return { success: false, error: GENERIC_ERROR }
    }
    customer = newCustomer
  }

  // ¿Ya tiene tarjeta en este programa?
  const { data: existingCard } = await supabase
    .from('cards')
    .select('serial')
    .eq('program_id', programId)
    .eq('customer_id', customer!.id)
    .single()

  // Nunca devolver la tarjeta existente: cualquiera que escribiera el teléfono de otra
  // persona obtendría el enlace a su tarjeta (y su QR para canjear recompensas).
  if (existingCard) {
    return {
      success: false,
      code: 'duplicate',
      error: 'Ya hay una tarjeta registrada con este número. Si es tuya y perdiste el enlace, pide ayuda en el negocio.',
    }
  }

  const serial = randomBytes(16).toString('hex')

  // OJO: este insert ahora SÍ pide "id" de vuelta con .select('id').single()
  const { error: cardError } = await supabase
    .from('cards')
    .insert({
      business_id: businessId,
      program_id: programId,
      customer_id: customer!.id,
      serial,
    })
    .select('id')
    .single()

  if (cardError) {
    console.error('No se pudo crear la tarjeta:', cardError)
    return { success: false, error: GENERIC_ERROR }
  }

  try {
    await syncWalletPass(serial)
  } catch (err) {
    // No bloquea el registro: el pase se vuelve a intentar al tocar "Agregar a Google Wallet"
    console.error('No se pudo crear el objeto de Google Wallet:', err)
  }

  return { success: true, serial }
}