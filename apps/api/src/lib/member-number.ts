export function normalizeMemberNumberPrefix(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed.toUpperCase() : null
}

export function composeMemberNumber(prefix: string | null | undefined, suffix: string) {
  const normalizedPrefix = normalizeMemberNumberPrefix(prefix)
  const normalizedSuffix = suffix.trim().toUpperCase()

  if (!normalizedPrefix) {
    return normalizedSuffix
  }

  return normalizedSuffix.startsWith(normalizedPrefix)
    ? normalizedSuffix
    : `${normalizedPrefix}${normalizedSuffix}`
}
