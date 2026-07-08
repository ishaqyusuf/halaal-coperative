export const cooperativeCountryOptions = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United Kingdom",
  "United States",
] as const

export const defaultCooperativeCountry = "Nigeria" as const

export type CooperativeCountry = (typeof cooperativeCountryOptions)[number]

export function isCooperativeCountry(value: unknown): value is CooperativeCountry {
  return (
    typeof value === "string" &&
    cooperativeCountryOptions.includes(value as CooperativeCountry)
  )
}
