import {
  getScopedAuthSessionCookieName,
  getScopedAuthUserCookieName,
  type SessionScope,
} from "@halaalvest/auth"
import type { NextRequest, NextResponse } from "next/server"

/**
 * The one set of dashboard auth cookie options: host-only, httpOnly,
 * `sameSite: lax`, `path: /`, `secure` on HTTPS, and no `maxAge` (the signed
 * session token carries its own expiry). Pass `expires` to clear or bound a
 * cookie.
 */
export function buildSessionCookieOptions(
  request: NextRequest,
  expires?: Date
) {
  return {
    ...(expires ? { expires } : {}),
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  }
}

/** Sets the scoped session-token and user-id cookies on a response. */
export function setDashboardSessionCookies(
  response: NextResponse,
  input: {
    request: NextRequest
    scope: SessionScope
    sessionToken: string
    userId: string
  }
) {
  const options = buildSessionCookieOptions(input.request)

  response.cookies.set(
    getScopedAuthSessionCookieName(input.scope),
    input.sessionToken,
    options
  )
  response.cookies.set(
    getScopedAuthUserCookieName(input.scope),
    input.userId,
    options
  )

  return response
}
