const cooperativePrefixPattern = /^[A-Z]{3,5}$/

export function normalizeCooperativeCodePrefix(
  value: string | null | undefined
) {
  return (value ?? "").trim().toUpperCase()
}

export function isValidCooperativeCodePrefix(value: string | null | undefined) {
  return cooperativePrefixPattern.test(normalizeCooperativeCodePrefix(value))
}

export function normalizeCooperativeAccessCode(
  value: string | null | undefined
) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function composeCooperativeAccessCode(
  prefix: string,
  identifier: string
) {
  const normalizedPrefix = normalizeCooperativeCodePrefix(prefix)
  const normalizedIdentifier = normalizeCooperativeAccessCode(identifier)

  if (!isValidCooperativeCodePrefix(normalizedPrefix)) {
    throw new Error("A valid cooperative prefix is required.")
  }

  if (!normalizedIdentifier) {
    throw new Error("A cooperative account identifier is required.")
  }

  return normalizedIdentifier === normalizedPrefix ||
    normalizedIdentifier.startsWith(`${normalizedPrefix}-`)
    ? normalizedIdentifier
    : `${normalizedPrefix}-${normalizedIdentifier}`
}

export function cooperativeMemberNumberPrefix(prefix: string) {
  const normalizedPrefix = normalizeCooperativeCodePrefix(prefix)

  if (!isValidCooperativeCodePrefix(normalizedPrefix)) {
    throw new Error("A valid cooperative prefix is required.")
  }

  return `${normalizedPrefix}-`
}
