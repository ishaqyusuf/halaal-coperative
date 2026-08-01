import {
  buildTenantAppUrl,
  normalizeHost,
  stripPort,
} from "@halaalvest/tenant-url"

export type OnboardingWorkspaceUrlVariant = {
  description: string
  label: string
  url: string
}

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

  if (process.env.NODE_ENV !== "production") {
    return `https://${getDashboardRootDomain()}`
  }

  if (configuredOrigin) {
    return configuredOrigin
  }

  const current = parseOriginLike(currentOrigin)
  return current?.origin ?? "https://halaalvest.com"
}

function getTenantSiteOrigin(currentOrigin?: string | null) {
  const configuredOrigin =
    process.env.TENANT_SITE_APP_URL ??
    process.env.NEXT_PUBLIC_TENANT_SITE_APP_URL

  if (process.env.NODE_ENV !== "production") {
    return `https://${getTenantRootDomain()}`
  }

  return configuredOrigin ?? currentOrigin ?? "https://halaalvest.com"
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

function getDashboardRootDomain() {
  return process.env.NODE_ENV === "production"
    ? process.env.DASHBOARD_ROOT_DOMAIN?.trim() ||
        process.env.PLATFORM_ROOT_DOMAIN?.trim() ||
        "halaalvest.com"
    : process.env.DASHBOARD_ROOT_DOMAIN?.trim() || "halaalvest-dash.localhost"
}

function getTenantRootDomain() {
  return process.env.NODE_ENV === "production"
    ? process.env.TENANT_ROOT_DOMAIN?.trim() ||
        process.env.PLATFORM_ROOT_DOMAIN?.trim() ||
        "halaalvest.com"
    : process.env.TENANT_ROOT_DOMAIN?.trim() ||
        process.env.LOCAL_ROOT_DOMAIN?.trim() ||
        "halaalvest.localhost"
}

function getDashboardAppPort(dashboardOrigin: string) {
  return (
    process.env.DASHBOARD_PORT?.trim() ||
    parseOriginLike(dashboardOrigin)?.port ||
    "1441"
  )
}

function buildPathStyleTenantUrl(input: {
  path: string
  port?: string | null
  protocol: "http" | "https"
  tenantSlug: string
}) {
  const port = input.port?.trim()
  const suffix = input.path === "/" ? "" : input.path
  return `${input.protocol}://localhost${port ? `:${port}` : ""}/${
    input.tenantSlug
  }${suffix}`
}

function dedupeUrlVariants(variants: OnboardingWorkspaceUrlVariant[]) {
  const seen = new Set<string>()

  return variants.filter((variant) => {
    const key = variant.url.toLowerCase()

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function buildDevDashboardUrlVariants(input: {
  dashboardOrigin: string
  dashboardUrl: string
  tenantRootDomain: string
  tenantSlug: string
}) {
  if (process.env.NODE_ENV === "production") {
    return []
  }

  const dashboardDefaults = getTenantUrlDefaults(input.dashboardOrigin)
  const dashboardOriginUrl = parseOriginLike(input.dashboardOrigin)
  const portlessProtocol =
    dashboardOriginUrl?.protocol.replace(":", "") === "https" ? "https" : "http"
  const directProtocol = "http"
  const dashboardAppPort = getDashboardAppPort(input.dashboardOrigin)
  const productPath = "/"
  const configuredDashboardRoot = stripPort(dashboardDefaults.currentHost)

  return dedupeUrlVariants([
    {
      description: "Current onboarding default",
      label: "Primary dashboard URL",
      url: input.dashboardUrl,
    },
    {
      description: "Uses the configured dashboard app host",
      label: "Dashboard app host",
      url: buildTenantAppUrl({
        tenantSlug: input.tenantSlug,
        currentHost: configuredDashboardRoot,
        currentProtocol: portlessProtocol,
        path: productPath,
        targetPort: dashboardDefaults.targetPort,
        targetRootDomain: configuredDashboardRoot,
        enablePathStyleHosts: false,
        defaultProtocol: portlessProtocol,
      }),
    },
    {
      description: "Uses the configured local tenant root",
      label: "Tenant root host",
      url: buildTenantAppUrl({
        tenantSlug: input.tenantSlug,
        currentHost: input.tenantRootDomain,
        currentProtocol: portlessProtocol,
        path: productPath,
        targetPort: dashboardDefaults.targetPort,
        targetRootDomain: input.tenantRootDomain,
        enablePathStyleHosts: false,
        defaultProtocol: portlessProtocol,
      }),
    },
    {
      description: "Uses wildcard localhost DNS",
      label: "Localhost subdomain",
      url: buildTenantAppUrl({
        tenantSlug: input.tenantSlug,
        currentHost: "localhost",
        currentProtocol: directProtocol,
        path: productPath,
        targetPort: dashboardAppPort,
        targetRootDomain: "localhost",
        enablePathStyleHosts: false,
        defaultProtocol: directProtocol,
      }),
    },
    {
      description: "Uses path-style local routing",
      label: "Localhost path",
      url: buildPathStyleTenantUrl({
        tenantSlug: input.tenantSlug,
        path: productPath,
        port: dashboardAppPort,
        protocol: directProtocol,
      }),
    },
  ])
}

export function buildOnboardingWorkspaceUrls(input: {
  currentOrigin?: string | null
  tenantSlug: string
}) {
  const dashboardOrigin = getDashboardAppOrigin(input.currentOrigin)
  const siteOrigin = getTenantSiteOrigin(input.currentOrigin)
  const dashboardDefaults = getTenantUrlDefaults(dashboardOrigin)
  const siteDefaults = getTenantUrlDefaults(siteOrigin)
  const dashboardRootDomain = getDashboardRootDomain()
  const tenantRootDomain = getTenantRootDomain()
  const pathStyleHosts = ["localhost", "127.0.0.1", "0.0.0.0"]
  const commonOptions = {
    enablePathStyleHosts: process.env.NODE_ENV !== "production",
    pathStyleHosts,
    tenantSlug: input.tenantSlug,
    defaultProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
  } as const
  const dashboardUrl = buildTenantAppUrl({
    ...commonOptions,
    currentHost: dashboardDefaults.currentHost,
    currentProtocol: dashboardDefaults.currentProtocol,
    enablePathStyleHosts: false,
    path: "/",
    targetPort: dashboardDefaults.targetPort,
    targetRootDomain: dashboardRootDomain,
  })
  const siteUrl = buildTenantAppUrl({
    ...commonOptions,
    currentHost: siteDefaults.currentHost,
    currentProtocol: siteDefaults.currentProtocol,
    path: "/",
    targetPort: siteDefaults.targetPort,
    targetRootDomain: tenantRootDomain,
  })

  return {
    dashboardUrl,
    devDashboardUrlVariants: buildDevDashboardUrlVariants({
      dashboardOrigin,
      dashboardUrl,
      tenantRootDomain: dashboardRootDomain,
      tenantSlug: input.tenantSlug,
    }),
    siteUrl,
  }
}
