import {
  extractDashboardHostname,
  extractDashboardTenantSlug,
  isTenantDashboardHost,
  resolveDashboardSessionScope,
} from "@halaalvest/utils"
import { type NextRequest, NextResponse } from "next/server"

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
  const { pathname } = request.nextUrl
  const host = request.headers.get("host") ?? ""
  const tenantHostname = extractDashboardHostname(host)
  const tenantSlug = extractDashboardTenantSlug(host)
  const requestHeaders = new Headers(request.headers)

  requestHeaders.delete("x-user-id")
  requestHeaders.delete("x-session-token")
  requestHeaders.delete("x-tenant-hostname")
  requestHeaders.delete("x-tenant-subdomain")

  if (tenantHostname) {
    requestHeaders.set("x-tenant-hostname", tenantHostname)
  }

  if (tenantSlug) {
    requestHeaders.set("x-tenant-subdomain", tenantSlug)
  }

  requestHeaders.set("x-pathname", pathname)

  if (
    isTenantDashboardHost(host) &&
    pathname.startsWith("/signup/member") &&
    !pathname.startsWith("/signup/members")
  ) {
    const redirectUrl = new URL(
      pathname.replace("/signup/member", "/signup/members"),
      request.url
    )
    redirectUrl.search = request.nextUrl.search

    return NextResponse.redirect(redirectUrl)
  }

  if (!isPublicPath(pathname) && !hasSessionCookie(request)) {
    const signInUrl = new URL("/login", request.url)
    signInUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
