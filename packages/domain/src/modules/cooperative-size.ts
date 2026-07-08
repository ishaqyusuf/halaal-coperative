export const cooperativeSizeRanges = [
  {
    label: "1-25 members",
    max: 25,
    min: 1,
    value: 25,
  },
  {
    label: "26-100 members",
    max: 100,
    min: 26,
    value: 100,
  },
  {
    label: "101-250 members",
    max: 250,
    min: 101,
    value: 250,
  },
  {
    label: "251-500 members",
    max: 500,
    min: 251,
    value: 500,
  },
  {
    label: "501-1,000 members",
    max: 1000,
    min: 501,
    value: 1000,
  },
  {
    label: "1,000+ members",
    max: null,
    min: 1001,
    value: 1001,
  },
] as const

export type CooperativeSizeRange = (typeof cooperativeSizeRanges)[number]
export type CooperativeSizeRangeValue = CooperativeSizeRange["value"]

const cooperativeSizeRangeValues = new Set<number>(
  cooperativeSizeRanges.map((range) => range.value),
)

function toPositiveInteger(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null
  }

  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const numericValue = Number(trimmed)

  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : null
}

export function isCooperativeSizeRangeValue(
  value: unknown,
): value is CooperativeSizeRangeValue {
  const numericValue = toPositiveInteger(value)

  return numericValue !== null && cooperativeSizeRangeValues.has(numericValue)
}

export function parseCooperativeSizeRangeValue(
  value: unknown,
): CooperativeSizeRangeValue | null {
  const numericValue = toPositiveInteger(value)

  if (numericValue === null || !isCooperativeSizeRangeValue(numericValue)) {
    return null
  }

  return numericValue
}

export function resolveCooperativeSizeRange(
  value: unknown,
): CooperativeSizeRange | null {
  const numericValue = toPositiveInteger(value)

  if (numericValue === null) {
    return null
  }

  return (
    cooperativeSizeRanges.find((range) => {
      if (range.max === null) {
        return numericValue >= range.min
      }

      return numericValue >= range.min && numericValue <= range.max
    }) ?? null
  )
}

export function formatCooperativeSizeRangeLabel(
  value: unknown,
  fallback = "Not captured",
) {
  return resolveCooperativeSizeRange(value)?.label ?? fallback
}
