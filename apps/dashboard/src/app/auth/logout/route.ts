import {
  authSessionCookieName,
  authUserCookieName,
  getScopedAuthSessionCookieName,
  getScopedAuthUserCookieName,
  platformSessionScope,
  resolveRequestSessionScope,
} from "@halaalvest/auth"
import { NextResponse, type NextRequest } from "next/server"
import { buildDashboardRedirectUrl } from "@/lib/auth-redirect"
import { buildSessionCookieOptions } from "@/lib/auth-session-cookies"
import { getPublicRequestHost } from "@/lib/request-host"

export async function GET(request: NextRequest) {
  const host = getPublicRequestHost(request.headers)
  const scope = resolveRequestSessionScope(host) ?? platformSessionScope
  const response = NextResponse.redirect(
    buildDashboardRedirectUrl(request, "/login")
  )
  const options = buildSessionCookieOptions(request, new Date(0))

  response.cookies.set(getScopedAuthSessionCookieName(scope), "", options)
  response.cookies.set(getScopedAuthUserCookieName(scope), "", options)
  response.cookies.set(authSessionCookieName, "", options)
  response.cookies.set(authUserCookieName, "", options)

  return response
}
