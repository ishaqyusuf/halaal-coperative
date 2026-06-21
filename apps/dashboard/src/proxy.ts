import {
  extractDashboardHostname,
  extractDashboardTenantSlug,
  isTenantDashboardHost,
  resolveDashboardSessionScope,
} from "@halaalvest/utils"
import {
  buildTenantHref,
  getTenantUrlHeaderNames,
  resolveTenantUrlContext,
} from "@halaalvest/tenant-url"
import { type NextRequest, NextResponse } from "next/server"
import { getDashboardTenantUrlConfig } from "./utils/tenant-url-config"

const authSessionCookieName = "halaalvest_session"
const platformSessionScope = "platform"

const publicPrefixes = [
  "/",
  "/login",
  "/awaiting-approval",
  "/signup/",
  "/auth/",
  "/api/",
  "/_next/",
  "/favicon",
]

function getScopedAuthSessionCookieName(scope: string) {
  return scope === platformSessionScope
    ? authSessionCookieName
    : `${authSessionCookieName}_${scope}`
}

function isPublicPath(pathname: string) {
  return publicPrefixes.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)
  )
}

function hasSessionCookie(request: NextRequest) {
  const sessionScope = resolveDashboardSessionScope(request.headers.get("host"))
  const cookieName = getScopedAuthSessionCookieName(
    sessionScope ?? platformSessionScope
  )

  return (
    Boolean(request.cookies.get(cookieName)?.value) ||
    (sessionScope !== null &&
      Boolean(request.cookies.get(authSessionCookieName)?.value))
  )
}

export function proxy(request: NextRequest) {
  const config = getDashboardTenantUrlConfig()
  const headerNames = getTenantUrlHeaderNames(config)
  const { pathname } = request.nextUrl
  const host = request.headers.get("host") ?? ""
  const tenantUrlContext = resolveTenantUrlContext(
    {
      host,
      pathname,
      protocol: request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol,
    },
    config,
  )
  const productPath = tenantUrlContext.productPath
  const tenantHostname =
    tenantUrlContext.customDomainLookupHost ?? extractDashboardHostname(host)
  const tenantSlug = tenantUrlContext.tenantSlug ?? extractDashboardTenantSlug(host)
  const requestHeaders = new Headers(request.headers)

  requestHeaders.delete("x-user-id")
  requestHeaders.delete("x-session-token")
  requestHeaders.delete("x-tenant-hostname")
  requestHeaders.delete("x-tenant-subdomain")
  requestHeaders.delete(headerNames.domain)
  requestHeaders.delete(headerNames.pathname)
  requestHeaders.delete(headerNames.urlStyle)
  requestHeaders.delete(headerNames.externalBasePath)
  requestHeaders.delete(headerNames.externalPath)

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
  requestHeaders.set(headerNames.externalBasePath, tenantUrlContext.externalBasePath)
  requestHeaders.set(headerNames.externalPath, tenantUrlContext.externalPath)

  if (
    (isTenantDashboardHost(host) || Boolean(tenantSlug)) &&
    productPath.startsWith("/signup/member") &&
    !productPath.startsWith("/signup/members")
  ) {
    const redirectUrl = new URL(
      buildTenantHref(
        tenantUrlContext,
        productPath.replace("/signup/member", "/signup/members"),
        config,
      ),
      request.url
    )
    redirectUrl.search = request.nextUrl.search

    return NextResponse.redirect(redirectUrl)
  }

  if (!isPublicPath(productPath) && !hasSessionCookie(request)) {
    const signInUrl = new URL(
      buildTenantHref(
        tenantUrlContext,
        `/login?next=${encodeURIComponent(productPath)}`,
        config,
      ),
      request.url,
    )
    return NextResponse.redirect(signInUrl)
  }

  if (tenantUrlContext.style === "path" && productPath !== pathname) {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = productPath
    return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
