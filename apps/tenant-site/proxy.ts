import { resolveTenantSiteHostContext } from "@halaal-vest/utils"
import { type NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? ""
  const { tenantHostname, tenantSubdomain } = resolveTenantSiteHostContext(host)
  const requestHeaders = new Headers(request.headers)

  requestHeaders.set("x-tenant-pathname", request.nextUrl.pathname)

  if (tenantSubdomain) {
    requestHeaders.set("x-tenant-subdomain", tenantSubdomain)
  }
  if (tenantHostname) {
    requestHeaders.set("x-tenant-hostname", tenantHostname)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
}
