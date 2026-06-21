import { buildTenantAppUrl, normalizeHost } from "@halaalvest/tenant-url"

export const platformRootDomain =
  process.env.HALAAL_VEST_PLATFORM_ROOT_DOMAIN?.trim() || "halaalvest.com"
export const localPlatformRootDomain =
  process.env.HALAAL_VEST_LOCAL_ROOT_DOMAIN?.trim() || "halaalvest.localhost"
export const localTenantRootDomain =
  process.env.HALAAL_VEST_TENANT_LOCAL_ROOT_DOMAIN?.trim() || `app.${localPlatformRootDomain}`
export const dashboardSubdomainLabel = "dashboard"
export const localDashboardRootDomain =
  process.env.HALAAL_VEST_DASHBOARD_ROOT_DOMAIN?.trim() || localTenantRootDomain
export const platformAppHostname =
  process.env.HALAAL_VEST_PLATFORM_APP_HOSTNAME?.trim() || `app.${platformRootDomain}`

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
    return new URL(value.includes("://") ? value : `http://${value}`)
  } catch {
    return null
  }
}

function resolveCurrentHost(value: string | null | undefined) {
  return value ? normalizeHost(value) : ""
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

export function isReservedTenantSubdomainLabel(value: string) {
  return reservedTenantLabels.has(normalizeSubdomainLabel(value))
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
    ? `${dashboardSubdomainLabel}.${normalizedSubdomain}.${localTenantRootDomain}`
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
    targetPort?: number | string | null
  },
) {
  const normalizedSubdomain = normalizeSubdomainLabel(subdomain)

  if (!normalizedSubdomain) {
    return ""
  }

  const parsedOrigin = options?.currentOrigin ? parseOriginLike(options.currentOrigin) : null
  const tenantHostname = extractTenantHostname(options?.tenantHostname)
  const currentHost = resolveCurrentHost(parsedOrigin?.host ?? options?.currentOrigin)
  const isLocalPathStyleHost =
    currentHost === "localhost" ||
    currentHost.startsWith("localhost:") ||
    currentHost.startsWith("127.0.0.1") ||
    currentHost.startsWith("0.0.0.0")

  if (!isLocalPathStyleHost) {
    return buildTenantSiteUrl(normalizedSubdomain, {
      currentOrigin: options?.currentOrigin,
      pathname: options?.pathname ?? "/app",
      protocol: options?.protocol,
      targetPort: options?.targetPort,
      tenantHostname,
    })
  }

  return buildTenantAppUrl({
    tenantSlug: normalizedSubdomain,
    path: options?.pathname ?? "/app",
    currentHost,
    currentProtocol: options?.protocol ?? parsedOrigin?.protocol,
    targetRootDomain: localDashboardRootDomain,
    targetPort: options?.targetPort ?? parsedOrigin?.port,
    pathStyleHosts: ["localhost", "127.0.0.1", "0.0.0.0"],
    enablePathStyleHosts: process.env.NODE_ENV !== "production",
    defaultProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
  })
}

export function buildTenantSiteUrl(
  subdomain: string,
  options?: {
    currentOrigin?: string | null
    tenantHostname?: string | null
    pathname?: string
    protocol?: "http" | "https"
    targetPort?: number | string | null
  },
) {
  const normalizedSubdomain = normalizeSubdomainLabel(subdomain)

  if (!normalizedSubdomain) {
    return ""
  }

  const parsedOrigin = options?.currentOrigin ? parseOriginLike(options.currentOrigin) : null
  const currentHost = resolveCurrentHost(parsedOrigin?.host ?? options?.currentOrigin)
  const isLocalPathStyleHost =
    currentHost === "localhost" ||
    currentHost.startsWith("localhost:") ||
    currentHost.startsWith("127.0.0.1") ||
    currentHost.startsWith("0.0.0.0")

  const tenantHostname = extractTenantHostname(options?.tenantHostname)

  if (tenantHostname && !isLocalPathStyleHost) {
    const protocol = options?.protocol ?? parsedOrigin?.protocol.replace(":", "") ?? "https"
    const pathname = options?.pathname ?? ""
    const normalizedPathname = pathname ? (pathname.startsWith("/") ? pathname : `/${pathname}`) : ""

    return `${protocol}://${tenantHostname}${normalizedPathname}`
  }

  return buildTenantAppUrl({
    tenantSlug: normalizedSubdomain,
    path: options?.pathname ?? "/",
    currentHost,
    currentProtocol: options?.protocol ?? parsedOrigin?.protocol,
    targetRootDomain: process.env.NODE_ENV === "production" ? platformRootDomain : localTenantRootDomain,
    targetPort: options?.targetPort ?? parsedOrigin?.port,
    pathStyleHosts: ["localhost", "127.0.0.1", "0.0.0.0"],
    enablePathStyleHosts: process.env.NODE_ENV !== "production",
    defaultProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
  })
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
  const tenantSubdomain = extractSitefrontSubdomain(host ?? "")
  if (tenantSubdomain) {
    return tenantSubdomain
  }

  const tenantSlug = extractDashboardTenantSlug(host ?? "")

  if (tenantSlug) {
    return tenantSlug
  }

  const tenantHostContext = resolveTenantSiteHostContext(host ?? "")
  if (tenantHostContext.tenantHostname) {
    return tenantHostContext.tenantSubdomain ?? tenantHostContext.tenantHostname
  }

  return extractDashboardHostname(host ?? "")
}

export function isTenantDashboardHost(host: string) {
  return extractDashboardHostname(host) !== null || resolveTenantSiteHostContext(host).tenantHostname !== null
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
