import { extractDashboardHostname, extractDashboardTenantSlug, isTenantDashboardHost } from "@amanah/utils"
import { type NextRequest, NextResponse } from "next/server"

const PUBLIC_PREFIXES = ["/api/", "/_next/", "/favicon", "/login", "/sign-in", "/sign-up"]

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get("host") ?? ""
  const tenantHostname = extractDashboardHostname(host)
  const tenantSlug = extractDashboardTenantSlug(host)
  const isTenantMode = isTenantDashboardHost(host)
  const requestHeaders = new Headers(request.headers)

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
