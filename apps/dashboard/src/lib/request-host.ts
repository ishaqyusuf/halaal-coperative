function normalizeForwardedHeader(value: string | null | undefined) {
  const normalized = value?.split(",")[0]?.trim()
  return normalized || null
}

export function getPublicRequestHost(headers: Headers) {
  return (
    normalizeForwardedHeader(headers.get("x-forwarded-host")) ??
    normalizeForwardedHeader(headers.get("host")) ??
    ""
  )
}
