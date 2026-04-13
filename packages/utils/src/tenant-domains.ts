export const platformRootDomain = "halaal-vest.com"
export const localPlatformRootDomain = "halaal-vest.localhost"
export const localTenantRootDomain = `tenant.${localPlatformRootDomain}`
export const dashboardSubdomainLabel = "dashboard"
export const localDashboardRootDomain = "app.halaal-vest.localhost"
export const platformAppHostname = `app.${platformRootDomain}`

const reservedTenantLabels = new Set([
  "api",
  "app",
  "dashboard",
  "mail",
  "support",
  "tenant",
  "www",
])

function parseOriginLike(value: string) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function extractSingleLabelSubdomain(hostname: string, rootDomain: string): string | null {
  if (!hostname.endsWith(`.${rootDomain}`)) {
    return null
  }

  const subdomain = hostname.slice(0, -(rootDomain.length + 1))

  if (!subdomain || subdomain.includes(".")) {
    return null
  }

  return subdomain
}

function isAnyLocalPlatformHostname(hostname: string | null | undefined) {
  const normalizedHostname = hostname ? stripPortFromHostname(hostname) : ""

  return (
    normalizedHostname === localPlatformRootDomain ||
    normalizedHostname.endsWith(`.${localPlatformRootDomain}`)
  )
}

export function stripPortFromHostname(value: string) {
  return value.trim().toLowerCase().replace(/:\d+$/, "")
}

export function extractTenantHostname(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const hostname = stripPortFromHostname(value)

  if (!hostname || hostname === "localhost") {
    return null
  }

  return hostname
}

export function normalizeSubdomainLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function buildTenantSiteHostname(subdomain: string) {
  const normalizedSubdomain = normalizeSubdomainLabel(subdomain)
  return normalizedSubdomain ? `${normalizedSubdomain}.${platformRootDomain}` : ""
}

export function buildLocalTenantSiteHostname(subdomain: string) {
  const normalizedSubdomain = normalizeSubdomainLabel(subdomain)
  return normalizedSubdomain ? `${normalizedSubdomain}.${localTenantRootDomain}` : ""
}

export function buildDashboardHostname(subdomain: string) {
  const normalizedSubdomain = normalizeSubdomainLabel(subdomain)
  return normalizedSubdomain
    ? `${dashboardSubdomainLabel}.${normalizedSubdomain}.${platformRootDomain}`
    : ""
}

export function buildLocalDashboardHostname(subdomain: string) {
  const normalizedSubdomain = normalizeSubdomainLabel(subdomain)
  return normalizedSubdomain
    ? `${dashboardSubdomainLabel}.${normalizedSubdomain}.${localDashboardRootDomain}`
    : ""
}

export function buildDashboardCustomHostname(hostname: string) {
  const normalizedHostname = extractTenantHostname(hostname)

  if (!normalizedHostname) {
    return ""
  }

  return normalizedHostname.startsWith(`${dashboardSubdomainLabel}.`)
    ? normalizedHostname
    : `${dashboardSubdomainLabel}.${normalizedHostname}`
}

export function buildLocalDashboardCustomHostname(hostname: string) {
  const normalizedHostname = extractTenantHostname(hostname)

  if (!normalizedHostname) {
    return ""
  }

  const dashboardHostname = buildDashboardCustomHostname(normalizedHostname)
  return dashboardHostname ? `${dashboardHostname}.localhost` : ""
}

export function extractSitefrontSubdomain(host: string) {
  const hostname = stripPortFromHostname(host)

  if (!hostname || hostname === "localhost") {
    return null
  }

  const localSubdomain = extractSingleLabelSubdomain(hostname, localTenantRootDomain)

  if (localSubdomain) {
    return reservedTenantLabels.has(localSubdomain) ? null : localSubdomain
  }

  const productionSubdomain = extractSingleLabelSubdomain(hostname, platformRootDomain)

  if (productionSubdomain) {
    return reservedTenantLabels.has(productionSubdomain) ? null : productionSubdomain
  }

  return null
}

export function buildDashboardHostnameForTenantHostname(hostname: string) {
  const normalizedHostname = extractTenantHostname(hostname)

  if (!normalizedHostname) {
    return ""
  }

  const sitefrontSubdomain = extractSitefrontSubdomain(normalizedHostname)

  if (sitefrontSubdomain) {
    return normalizedHostname.endsWith(`.${localTenantRootDomain}`)
      ? buildLocalDashboardHostname(sitefrontSubdomain)
      : buildDashboardHostname(sitefrontSubdomain)
  }

  return buildDashboardCustomHostname(normalizedHostname)
}

export function buildLocalDashboardHostnameForTenantHostname(hostname: string) {
  const normalizedHostname = extractTenantHostname(hostname)

  if (!normalizedHostname) {
    return ""
  }

  const sitefrontSubdomain = extractSitefrontSubdomain(normalizedHostname)

  if (sitefrontSubdomain) {
    return buildLocalDashboardHostname(sitefrontSubdomain)
  }

  return buildLocalDashboardCustomHostname(normalizedHostname)
}

export function buildTenantDashboardUrl(
  subdomain: string,
  options?: {
    currentOrigin?: string | null
    tenantHostname?: string | null
    pathname?: string
    protocol?: "http" | "https"
  },
) {
  const normalizedSubdomain = normalizeSubdomainLabel(subdomain)

  if (!normalizedSubdomain) {
    return ""
  }

  const parsedOrigin = options?.currentOrigin ? parseOriginLike(options.currentOrigin) : null
  const protocol = options?.protocol ?? parsedOrigin?.protocol.replace(":", "") ?? "https"
  const pathname = options?.pathname ?? ""
  const normalizedPathname = pathname ? (pathname.startsWith("/") ? pathname : `/${pathname}`) : ""
  const port = parsedOrigin?.port ? `:${parsedOrigin.port}` : ""

  if (isAnyLocalPlatformHostname(parsedOrigin?.hostname)) {
    const localTenantDashboardHostname = options?.tenantHostname
      ? buildLocalDashboardHostnameForTenantHostname(options.tenantHostname)
      : ""

    if (localTenantDashboardHostname) {
      return `${protocol}://${localTenantDashboardHostname}${port}${normalizedPathname}`
    }

    return `${protocol}://${localDashboardRootDomain}${port}${normalizedPathname}`
  }

  const tenantDashboardHostname = options?.tenantHostname
    ? buildDashboardHostnameForTenantHostname(options.tenantHostname)
    : ""

  if (tenantDashboardHostname) {
    return `${protocol}://${tenantDashboardHostname}${normalizedPathname}`
  }

  return `${protocol}://${buildDashboardHostname(normalizedSubdomain)}${normalizedPathname}`
}

export function buildTenantSiteUrl(
  subdomain: string,
  options?: {
    currentOrigin?: string | null
    tenantHostname?: string | null
    pathname?: string
    protocol?: "http" | "https"
  },
) {
  const normalizedSubdomain = normalizeSubdomainLabel(subdomain)

  if (!normalizedSubdomain) {
    return ""
  }

  const parsedOrigin = options?.currentOrigin ? parseOriginLike(options.currentOrigin) : null
  const protocol = options?.protocol ?? parsedOrigin?.protocol.replace(":", "") ?? "https"
  const pathname = options?.pathname ?? ""
  const normalizedPathname = pathname ? (pathname.startsWith("/") ? pathname : `/${pathname}`) : ""
  const port = parsedOrigin?.port ? `:${parsedOrigin.port}` : ""

  if (isAnyLocalPlatformHostname(parsedOrigin?.hostname)) {
    return `${protocol}://${buildLocalTenantSiteHostname(normalizedSubdomain)}${port}${normalizedPathname}`
  }

  const tenantHostname = extractTenantHostname(options?.tenantHostname)

  if (tenantHostname) {
    return `${protocol}://${tenantHostname}${normalizedPathname}`
  }

  return `${protocol}://${buildTenantSiteHostname(normalizedSubdomain)}${normalizedPathname}`
}

export function buildPlatformAppUrl(options?: {
  currentOrigin?: string | null
  pathname?: string
  protocol?: "http" | "https"
}) {
  const parsedOrigin = options?.currentOrigin ? parseOriginLike(options.currentOrigin) : null
  const protocol = options?.protocol ?? parsedOrigin?.protocol.replace(":", "") ?? "https"
  const pathname = options?.pathname ?? ""
  const normalizedPathname = pathname ? (pathname.startsWith("/") ? pathname : `/${pathname}`) : ""
  const port = parsedOrigin?.port ? `:${parsedOrigin.port}` : ""

  if (isAnyLocalPlatformHostname(parsedOrigin?.hostname)) {
    return `${protocol}://${localDashboardRootDomain}${port}${normalizedPathname}`
  }

  return `${protocol}://${platformAppHostname}${normalizedPathname}`
}

export function extractDashboardHostname(host: string) {
  const hostname = stripPortFromHostname(host)

  if (!hostname || hostname === "localhost") {
    return null
  }

  if (hostname === localDashboardRootDomain || hostname === platformAppHostname) {
    return null
  }

  if (hostname.endsWith(`.${localDashboardRootDomain}`)) {
    const withoutRoot = hostname.slice(0, -(localDashboardRootDomain.length + 1))
    const parts = withoutRoot.split(".")

    return parts.length === 2 && parts[0] === dashboardSubdomainLabel && Boolean(parts[1])
      ? hostname
      : null
  }

  if (hostname.endsWith(`.${platformRootDomain}`)) {
    const withoutRoot = hostname.slice(0, -(platformRootDomain.length + 1))
    const parts = withoutRoot.split(".")

    return parts.length === 2 && parts[0] === dashboardSubdomainLabel && Boolean(parts[1])
      ? hostname
      : null
  }

  return hostname.startsWith(`${dashboardSubdomainLabel}.`) ? hostname : null
}

export function extractDashboardTenantSlug(host: string) {
  const hostname = extractDashboardHostname(host)

  if (!hostname) {
    return null
  }

  if (hostname.endsWith(`.${localDashboardRootDomain}`)) {
    const withoutRoot = hostname.slice(0, -(localDashboardRootDomain.length + 1))
    const parts = withoutRoot.split(".")
    return parts.length === 2 && parts[0] === dashboardSubdomainLabel ? (parts[1] ?? null) : null
  }

  if (hostname.endsWith(`.${platformRootDomain}`)) {
    const withoutRoot = hostname.slice(0, -(platformRootDomain.length + 1))
    const parts = withoutRoot.split(".")
    return parts.length === 2 && parts[0] === dashboardSubdomainLabel ? (parts[1] ?? null) : null
  }

  return null
}

export function resolveDashboardSessionScope(host: string | null | undefined) {
  const tenantSlug = extractDashboardTenantSlug(host ?? "")

  if (tenantSlug) {
    return tenantSlug
  }

  return extractDashboardHostname(host ?? "")
}

export function isTenantDashboardHost(host: string) {
  return extractDashboardHostname(host) !== null
}

export function resolveTenantSiteHostContext(host: string): {
  tenantHostname: string | null
  tenantSubdomain: string | null
} {
  const hostname = stripPortFromHostname(host)

  if (
    !hostname ||
    hostname === "localhost" ||
    hostname === localPlatformRootDomain ||
    hostname === localTenantRootDomain ||
    hostname === localDashboardRootDomain ||
    hostname === platformAppHostname ||
    hostname.startsWith(`${dashboardSubdomainLabel}.`)
  ) {
    return { tenantHostname: null, tenantSubdomain: null }
  }

  const tenantSubdomain = extractSitefrontSubdomain(hostname)

  if (tenantSubdomain) {
    return { tenantHostname: hostname, tenantSubdomain }
  }

  return { tenantHostname: hostname, tenantSubdomain: null }
}
