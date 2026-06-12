/**
 * US-only phone helpers (launch constraint per the V2 roadmap: +1 numbers
 * only — an SMS-pumping mitigation). Safe in both client and server code.
 */

/** Normalize US phone input to E.164 (+1XXXXXXXXXX). Returns null if invalid. */
export function normalizeUsPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return null
}

/** Mask an E.164 number for display: (•••) •••-4927 */
export function maskPhone(phone: string): string {
  return `(•••) •••-${phone.slice(-4)}`
}
