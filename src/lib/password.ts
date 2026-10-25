// Reglas de contraseña compartidas por el registro (/login) y el cambio de contraseña (/reset-password)

export function passwordChecks(value: string) {
  return {
    length: value.length >= 8,
    digit: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  }
}

export const PASSWORD_RULES = [
  { key: 'length', label: 'Mínimo 8 caracteres' },
  { key: 'digit', label: 'Al menos un número' },
  { key: 'special', label: 'Al menos un carácter especial' },
] as const

export function isPasswordValid(value: string) {
  const c = passwordChecks(value)
  return c.length && c.digit && c.special
}
