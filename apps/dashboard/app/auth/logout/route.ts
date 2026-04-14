import {
  authSessionCookieName,
  authUserCookieName,
  getScopedAuthSessionCookieName,
  getScopedAuthUserCookieName,
  platformSessionScope,
  resolveRequestSessionScope,
} from "@halaal-vest/auth"
import { NextResponse, type NextRequest } from "next/server"

function expiredCookieOptions(request: NextRequest) {
  return {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  }
}

export async function GET(request: NextRequest) {
  const host = request.headers.get("host")
  const scope = resolveRequestSessionScope(host) ?? platformSessionScope
  const response = NextResponse.redirect(new URL("/login", request.url))
  const options = expiredCookieOptions(request)

  response.cookies.set(getScopedAuthSessionCookieName(scope), "", options)
  response.cookies.set(getScopedAuthUserCookieName(scope), "", options)
  response.cookies.set(authSessionCookieName, "", options)
  response.cookies.set(authUserCookieName, "", options)

  return response
}
