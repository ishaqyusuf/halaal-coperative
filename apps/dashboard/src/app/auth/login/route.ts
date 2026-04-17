import { randomUUID } from "node:crypto"
import {
  getScopedAuthSessionCookieName,
  getScopedAuthUserCookieName,
  platformSessionScope,
  resolveRequestSessionScope,
} from "@halaal-vest/auth"
import {
  findActiveMembershipAsync,
  findUserByEmailAsync,
  findUserByIdAsync,
  getPendingMemberOnboardingForUser,
  resolveTenantAsync,
} from "@halaal-vest/db"
import { NextResponse, type NextRequest } from "next/server"
import {
  buildDashboardRedirectUrl,
  normalizeDashboardRedirectPath,
} from "@/lib/auth-redirect"
import { verifyPassword } from "@/lib/password"

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
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") ?? "")
  const nextPath = normalizeDashboardRedirectPath(
    String(formData.get("next") ?? "/")
  )
  const loginPath = buildDashboardRedirectUrl(
    request,
    `/login?next=${encodeURIComponent(nextPath)}&error=invalid-account`
  )

  if (!userId && (!email || !password)) {
    return NextResponse.redirect(loginPath)
  }

  const host = request.headers.get("host")
  const scope = resolveRequestSessionScope(host) ?? platformSessionScope
  const tenantResolution = await resolveTenantAsync({
    hostname: request.headers.get("x-tenant-hostname") ?? host,
    slug: request.headers.get("x-tenant-subdomain"),
  })

  const credentialUser = userId
    ? null
    : await findUserByEmailAsync({
        email,
        tenantId: tenantResolution.tenant?.id ?? null,
      })
  const user = userId ? await findUserByIdAsync(userId) : credentialUser

  if (!user) {
    return NextResponse.redirect(loginPath)
  }

  if (
    tenantResolution.tenant &&
    !user.isPlatformOwner &&
    user.tenantId !== tenantResolution.tenant.id
  ) {
    return NextResponse.redirect(loginPath)
  }

  if (
    credentialUser &&
    !verifyPassword(password, credentialUser.passwordHash)
  ) {
    return NextResponse.redirect(loginPath)
  }

  const membership = await findActiveMembershipAsync({
    tenantId: tenantResolution.tenant?.id ?? user.tenantId,
    userId: user.id,
  })

  const pendingOnboarding =
    !membership && tenantResolution.tenant
      ? await getPendingMemberOnboardingForUser({
          tenantId: tenantResolution.tenant.id,
          userId: user.id,
        })
      : null

  if (!membership && !pendingOnboarding && !user.isPlatformOwner) {
    return NextResponse.redirect(loginPath)
  }

  const response = NextResponse.redirect(
    buildDashboardRedirectUrl(request, nextPath)
  )
  const options = buildCookieOptions(request)

  response.cookies.set(
    getScopedAuthSessionCookieName(scope),
    randomUUID(),
    options
  )
  response.cookies.set(getScopedAuthUserCookieName(scope), user.id, options)

  return response
}
