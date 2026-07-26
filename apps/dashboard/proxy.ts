import {
  buildLocalTenantSiteHostname,
  buildTenantSiteHostname,
  extractDashboardHostname,
  extractDashboardTenantSlug,
  isTenantDashboardHost,
  resolveTenantSiteHostContext,
} from "@halaalvest/utils"
import {
  getTenantUrlHeaderNames,
  resolveTenantUrlContext,
} from "@halaalvest/tenant-url"
import { type NextRequest, NextResponse } from "next/server"
import { getDashboardTenantUrlConfig } from "./src/utils/tenant-url-config"

const PUBLIC_PREFIXES = [
  "/api/",
  "/_next/",
  "/auth/",
  "/brand/",
  "/favicon",
  "/login",
  "/sign-in",
  "/sign-up",
  "/signup",
  "/awaiting-approval",
]

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function getRequestHost(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? ""
  )
}

export function proxy(request: NextRequest) {
  const config = getDashboardTenantUrlConfig()
  const headerNames = getTenantUrlHeaderNames(config)
  const { pathname } = request.nextUrl
  const host = getRequestHost(request)
  const tenantUrlContext = resolveTenantUrlContext(
    {
      host,
      pathname,
      protocol:
        request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol,
    },
    config
  )
  const productPath = tenantUrlContext.productPath
  const dashboardTenantHostname = extractDashboardHostname(host)
  const dashboardTenantSlug = extractDashboardTenantSlug(host)
  const tenantHostContext = resolveTenantSiteHostContext(host)
  const tenantHostname =
    tenantUrlContext.customDomainLookupHost ??
    tenantHostContext.tenantHostname ??
    dashboardTenantHostname
  const tenantSlug =
    tenantUrlContext.tenantSlug ??
    tenantHostContext.tenantSubdomain ??
    dashboardTenantSlug
  const isTenantMode = isTenantDashboardHost(host) || Boolean(tenantSlug)
  const requestHeaders = new Headers(request.headers)

  if (dashboardTenantSlug && dashboardTenantHostname) {
    const isLocalDashboardHost = host.endsWith(".localhost")
    const canonicalHost = isLocalDashboardHost
      ? buildLocalTenantSiteHostname(dashboardTenantSlug)
      : buildTenantSiteHostname(dashboardTenantSlug)
    const canonicalUrl = new URL(request.url)
    canonicalUrl.hostname = canonicalHost
    if (isLocalDashboardHost) {
      canonicalUrl.protocol = "http:"
    }

    return NextResponse.redirect(canonicalUrl)
  }

  if (tenantHostname) {
    requestHeaders.set("x-tenant-hostname", tenantHostname)
  }
  if (tenantSlug) {
    requestHeaders.set("x-tenant-subdomain", tenantSlug)
    requestHeaders.set(headerNames.domain, tenantSlug)
  }
  requestHeaders.set("x-pathname", productPath)
  requestHeaders.set(headerNames.pathname, productPath)
  requestHeaders.set(headerNames.urlStyle, tenantUrlContext.style)
  requestHeaders.set(
    headerNames.externalBasePath,
    tenantUrlContext.externalBasePath
  )
  requestHeaders.set(headerNames.externalPath, tenantUrlContext.externalPath)
  requestHeaders.set(
    "x-tenant-dashboard-mode",
    isTenantMode ? "tenant" : "platform"
  )

  if (!isPublicPath(productPath)) {
    requestHeaders.set("x-dashboard-protected-route", "true")
  }

  if (tenantUrlContext.style === "path" && productPath !== pathname) {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = productPath
    return NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    })
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|brand/|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
