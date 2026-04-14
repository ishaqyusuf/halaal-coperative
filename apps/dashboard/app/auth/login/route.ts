import { randomUUID } from "node:crypto"
import {
  getScopedAuthSessionCookieName,
  getScopedAuthUserCookieName,
  platformSessionScope,
  resolveRequestSessionScope,
} from "@halaal-vest/auth"
import { findActiveMembershipAsync, findUserByIdAsync, resolveTenantAsync } from "@halaal-vest/db"
import { NextResponse, type NextRequest } from "next/server"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"

function buildCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const userId = String(formData.get("userId") ?? "").trim()
  const nextPath = normalizeDashboardRedirectPath(String(formData.get("next") ?? "/"))
  const loginPath = new URL(`/login?next=${encodeURIComponent(nextPath)}&error=invalid-account`, request.url)

  if (!userId) {
    return NextResponse.redirect(loginPath)
  }

  const host = request.headers.get("host")
  const scope = resolveRequestSessionScope(host) ?? platformSessionScope
  const user = await findUserByIdAsync(userId)

  if (!user) {
    return NextResponse.redirect(loginPath)
  }

  const tenantResolution = await resolveTenantAsync({
    hostname: request.headers.get("x-tenant-hostname") ?? host,
    slug: request.headers.get("x-tenant-subdomain"),
  })

  if (tenantResolution.tenant && !user.isPlatformOwner && user.tenantId !== tenantResolution.tenant.id) {
    return NextResponse.redirect(loginPath)
  }

  const membership = await findActiveMembershipAsync({
    tenantId: tenantResolution.tenant?.id ?? user.tenantId,
    userId: user.id,
  })

  if (!membership && !user.isPlatformOwner) {
    return NextResponse.redirect(loginPath)
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url))
  const options = buildCookieOptions(request)

  response.cookies.set(getScopedAuthSessionCookieName(scope), randomUUID(), options)
  response.cookies.set(getScopedAuthUserCookieName(scope), user.id, options)

  return response
}
