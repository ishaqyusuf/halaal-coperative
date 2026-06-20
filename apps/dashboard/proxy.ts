import {
  buildLocalTenantSiteHostname,
  buildTenantSiteHostname,
  extractDashboardHostname,
  extractDashboardTenantSlug,
  isTenantDashboardHost,
  resolveTenantSiteHostContext,
} from "@halaalvest/utils"
import { type NextRequest, NextResponse } from "next/server"

const PUBLIC_PREFIXES = [
  "/api/",
  "/_next/",
  "/auth/",
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get("host") ?? ""
  const dashboardTenantHostname = extractDashboardHostname(host)
  const dashboardTenantSlug = extractDashboardTenantSlug(host)
  const tenantHostContext = resolveTenantSiteHostContext(host)
  const tenantHostname = tenantHostContext.tenantHostname ?? dashboardTenantHostname
  const tenantSlug = tenantHostContext.tenantSubdomain ?? dashboardTenantSlug
  const isTenantMode = isTenantDashboardHost(host)
  const requestHeaders = new Headers(request.headers)

  if (dashboardTenantSlug && dashboardTenantHostname) {
    const canonicalHost = request.nextUrl.hostname.endsWith(".localhost")
      ? buildLocalTenantSiteHostname(dashboardTenantSlug)
      : buildTenantSiteHostname(dashboardTenantSlug)
    const canonicalUrl = new URL(request.url)
    canonicalUrl.hostname = canonicalHost

    return NextResponse.redirect(canonicalUrl)
  }

  if (tenantHostname) {
    requestHeaders.set("x-tenant-hostname", tenantHostname)
  }
  if (tenantSlug) {
    requestHeaders.set("x-tenant-subdomain", tenantSlug)
  }
  requestHeaders.set("x-pathname", pathname)
  requestHeaders.set("x-tenant-dashboard-mode", isTenantMode ? "tenant" : "platform")

  if (!isPublicPath(pathname)) {
    requestHeaders.set("x-dashboard-protected-route", "true")
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
}
