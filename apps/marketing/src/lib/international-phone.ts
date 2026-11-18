import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js/max"
import examples from "libphonenumber-js/mobile/examples"

// Ported from ewatrade packages/onboarding/src/lib/international-phone.ts.
// Numbers are stored in E.164 (+2348031234567); the phone's country is kept
// separately so it can differ from the cooperative's country.

export type PhoneCountryCode = CountryCode

export function phoneCountry(
  value: string | null | undefined
): CountryCode | undefined {
  const code = value?.toUpperCase()
  return code && isSupportedCountry(code) ? (code as CountryCode) : undefined
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

export const PHONE_COUNTRIES = getCountries()
  .map((code) => ({
    callingCode: getCountryCallingCode(code),
    code,
    name: regionNames.of(code) ?? code,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "en"))

export function countryFlag(country: string) {
  return String.fromCodePoint(
    ...[...country.toUpperCase()].map((letter) => letter.charCodeAt(0) + 127397)
  )
}

export function phoneCallingCode(country: string | null | undefined) {
  const code = phoneCountry(country)
  return code ? getCountryCallingCode(code) : null
}

export function phonePlaceholder(country?: string | null) {
  const code = phoneCountry(country)
  if (!code) return "Phone number"
  const example = getExampleNumber(code, examples)
  return (
    example
      ?.formatInternational()
      .replace(/^\+\d+\s*/, "")
      .replace(/\d/g, "0") ?? "Phone number"
  )
}

/** The E.164 number for `value` in `country`, or null when it isn't valid. */
export function normalizeInternationalPhone(value: string, country: string) {
  const code = phoneCountry(country)
  if (!code) return null
  const parsed = parsePhoneNumberFromString(value.trim().replace(/^00/, "+"), {
    defaultCountry: code,
    extract: false,
  })
  if (
    !parsed ||
    parsed.ext ||
    !parsed.isValid() ||
    parsed.countryCallingCode !== getCountryCallingCode(code)
  )
    return null
  // Shared calling codes (for example US/Canada) still need a matching region.
  if (parsed.country && parsed.country !== code) return null
  return parsed.number
}

/** "+234 803 123 4567" for display; the raw value when it can't be parsed. */
export function formatInternationalPhone(value: string | null | undefined) {
  if (!value) return ""
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value
}

/**
 * Moves the typed national digits onto another calling code, so changing the
 * phone's country keeps what was typed (+234 803… → +233 803…).
 */
export function movePhoneToCountry(
  value: string,
  from: string | null | undefined,
  to: string
) {
  const fromCode = phoneCallingCode(from)
  const toCode = phoneCallingCode(to)
  if (!value || !toCode) return ""
  const national = fromCode
    ? value.replace(new RegExp(`^\\+${fromCode}`), "")
    : value.replace(/^\+/, "")
  return national ? `+${toCode}${national}` : ""
}

/** Country and E.164 number from pasted "+44 7400 123456"; null otherwise. */
export function parsePastedInternationalPhone(text: string) {
  const value = text.trim().replace(/^00/, "+")
  if (!value.startsWith("+")) return null
  const parsed = parsePhoneNumberFromString(value, { extract: false })
  if (!parsed?.country || parsed.ext) return null
  return { country: parsed.country, number: parsed.number }
}
