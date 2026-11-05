function parseDomainLike(value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) return null

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`)
      .host
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null
  }
}

export function getWorkspaceUrlSuffix() {
  const configuredDomain =
    parseDomainLike(process.env.PLATFORM_ROOT_DOMAIN) ?? "halaalvest.localhost"

  return `.${configuredDomain.replace(/^\./, "")}`
}
