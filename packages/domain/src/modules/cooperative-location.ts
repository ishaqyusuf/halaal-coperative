export const cooperativeCountryOptions = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United Kingdom",
  "United States",
] as const

export const defaultCooperativeCountry = "Nigeria" as const

/** ISO 3166-1 alpha-2 code per supported country (flags and phone prefixes). */
export const cooperativeCountryCodes = {
  Nigeria: "NG",
  Ghana: "GH",
  Kenya: "KE",
  "South Africa": "ZA",
  "United Kingdom": "GB",
  "United States": "US",
} as const satisfies Record<(typeof cooperativeCountryOptions)[number], string>

export type CooperativeCountry = (typeof cooperativeCountryOptions)[number]

export function isCooperativeCountry(value: unknown): value is CooperativeCountry {
  return (
    typeof value === "string" &&
    cooperativeCountryOptions.includes(value as CooperativeCountry)
  )
}
