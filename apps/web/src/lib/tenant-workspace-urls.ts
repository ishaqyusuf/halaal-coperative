import { buildTenantAppUrl, normalizeHost } from "@halaalvest/tenant-url"

function parseOriginLike(value?: string | null) {
  if (!value) return null

  try {
    return new URL(value.includes("://") ? value : `http://${value}`)
  } catch {
    return null
  }
}

function stripPort(host: string) {
  if (host.startsWith("[")) return host.replace(/]:\d+$/, "]")
  return host.replace(/:\d+$/, "")
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

export function buildOnboardingWorkspaceUrls(input: {
  currentOrigin?: string | null
  tenantSlug: string
}) {
  const dashboardOrigin = getDashboardAppOrigin(input.currentOrigin)
  const defaults = getTenantUrlDefaults(dashboardOrigin)
  const dashboardRootDomain =
    process.env.HALAAL_VEST_DASHBOARD_ROOT_DOMAIN?.trim() ||
    process.env.APP_ROOT_DOMAIN?.trim() ||
    stripPort(defaults.currentHost) ||
    "app.halaalvest.localhost"
  const tenantRootDomain =
    process.env.HALAAL_VEST_TENANT_LOCAL_ROOT_DOMAIN?.trim() ||
    process.env.HALAAL_VEST_PLATFORM_ROOT_DOMAIN?.trim() ||
    "halaalvest.com"
  const pathStyleHosts = ["localhost", "127.0.0.1", "0.0.0.0"]
  const commonOptions = {
    currentHost: defaults.currentHost,
    currentProtocol: defaults.currentProtocol,
    enablePathStyleHosts: process.env.NODE_ENV !== "production",
    pathStyleHosts,
    targetPort: defaults.targetPort,
    tenantSlug: input.tenantSlug,
    defaultProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
  } as const

  return {
    dashboardUrl: buildTenantAppUrl({
      ...commonOptions,
      path: "/",
      targetRootDomain: dashboardRootDomain,
    }),
    siteUrl: buildTenantAppUrl({
      ...commonOptions,
      path: "/",
      targetRootDomain: tenantRootDomain,
    }),
  }
}
