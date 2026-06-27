import { buildTenantAppUrl, normalizeHost } from "@halaalvest/tenant-url"

function parseOriginLike(value?: string | null) {
  if (!value) return null

  try {
    return new URL(value.includes("://") ? value : `http://${value}`)
  } catch {
    return null
  }
}

function getDashboardAppOrigin(currentOrigin?: string | null) {
  const configuredOrigin =
    process.env.DASHBOARD_APP_URL ?? process.env.NEXT_PUBLIC_DASHBOARD_APP_URL

  if (configuredOrigin) {
    return configuredOrigin
  }

  const current = parseOriginLike(currentOrigin)
  const hostname = current?.hostname ?? ""

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  ) {
    const port = process.env.HALAAL_VEST_DASHBOARD_APP_PORT ?? "1441"
    return `${current?.protocol ?? "http:"}//${hostname}:${port}`
  }

  return currentOrigin ?? "http://app.halaalvest.localhost:1441"
}

function getTenantSiteOrigin(currentOrigin?: string | null) {
  return (
    process.env.TENANT_SITE_APP_URL ??
    process.env.NEXT_PUBLIC_TENANT_SITE_APP_URL ??
    currentOrigin ??
    "http://halaalvest.localhost:1440"
  )
}

function getTenantUrlDefaults(origin: string) {
  const parsedOrigin = parseOriginLike(origin)
  const currentHost = normalizeHost(parsedOrigin?.host ?? origin)
  const currentProtocol =
    parsedOrigin?.protocol.replace(":", "") === "https" ? "https" : "http"
  const targetPort = parsedOrigin?.port || undefined

  return {
    currentHost,
    currentProtocol,
    targetPort,
  } as const
}

function isLocalOrigin(origin: string) {
  const parsedOrigin = parseOriginLike(origin)
  const hostname = parsedOrigin?.hostname ?? ""

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".localhost")
  )
}

export function buildOnboardingWorkspaceUrls(input: {
  currentOrigin?: string | null
  tenantSlug: string
}) {
  const dashboardOrigin = getDashboardAppOrigin(input.currentOrigin)
  const siteOrigin = getTenantSiteOrigin(input.currentOrigin)
  const dashboardDefaults = getTenantUrlDefaults(dashboardOrigin)
  const siteDefaults = getTenantUrlDefaults(siteOrigin)
  const tenantRootDomain =
    process.env.NODE_ENV === "production"
      ? process.env.HALAAL_VEST_PLATFORM_ROOT_DOMAIN?.trim() || "halaalvest.com"
      : process.env.HALAAL_VEST_TENANT_LOCAL_ROOT_DOMAIN?.trim() ||
        process.env.HALAAL_VEST_PLATFORM_ROOT_DOMAIN?.trim() ||
        "halaalvest.localhost"
  const pathStyleHosts = ["localhost", "127.0.0.1", "0.0.0.0"]
  const commonOptions = {
    enablePathStyleHosts: process.env.NODE_ENV !== "production",
    pathStyleHosts,
    tenantSlug: input.tenantSlug,
    defaultProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
  } as const

  return {
    dashboardUrl: buildTenantAppUrl({
      ...commonOptions,
      currentHost: dashboardDefaults.currentHost,
      currentProtocol: dashboardDefaults.currentProtocol,
      path: isLocalOrigin(dashboardOrigin) ? "/" : "/app",
      targetPort: dashboardDefaults.targetPort,
      targetRootDomain: tenantRootDomain,
    }),
    siteUrl: buildTenantAppUrl({
      ...commonOptions,
      currentHost: siteDefaults.currentHost,
      currentProtocol: siteDefaults.currentProtocol,
      path: "/",
      targetPort: siteDefaults.targetPort,
      targetRootDomain: tenantRootDomain,
    }),
  }
}
