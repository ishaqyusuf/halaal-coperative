/**
 * Nigerian mobile numbers for PhoneField. The field stores national digits
 * without the leading 0 ("8030000000"); the API receives E.164.
 */

export const NIGERIA_DIAL_CODE = "+234"

/** "0803 000 0000", "+234 803…", "234803…" -> "8030000000" (max 10). */
export function normalizeNigerianPhone(text: string) {
  let digits = text.replace(/\D/g, "")
  if (digits.startsWith("234")) digits = digits.slice(3)
  if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(0, 10)
}

/** "8030000000" -> "803 000 0000" (groups 3-3-4 as typed). */
export function formatNigerianPhone(national: string) {
  const digits = normalizeNigerianPhone(national)
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)]
    .filter(Boolean)
    .join(" ")
}

export function toNigerianE164(national: string) {
  const digits = normalizeNigerianPhone(national)
  return digits.length === 10 ? `${NIGERIA_DIAL_CODE}${digits}` : null
}

export function isCompleteNigerianPhone(national: string) {
  return /^[789]\d{9}$/.test(normalizeNigerianPhone(national))
}
