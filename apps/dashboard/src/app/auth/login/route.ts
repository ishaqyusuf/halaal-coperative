import {
  createSignedSessionToken,
  platformSessionScope,
  resolveRequestSessionScope,
} from "@halaalvest/auth"
import {
  findActiveMembershipAsync,
  findUserByEmailAsync,
  findUserByTenantSignInIdentifierAsync,
  getPendingMemberOnboardingForUser,
  resolveTenantAsync,
} from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import {
  buildDashboardRedirectUrl,
  normalizeDashboardRedirectPath,
} from "@/lib/auth-redirect"
import { setDashboardSessionCookies } from "@/lib/auth-session-cookies"
import { verifyPassword } from "@/lib/password"
import { getPublicRequestHost } from "@/lib/request-host"
import { resolveInitialMigrationSetupGate } from "@/lib/setup-gate"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const identifier = String(
    formData.get("identifier") ?? formData.get("email") ?? ""
  )
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

  if (!identifier || !password) {
    return NextResponse.redirect(loginPath)
  }

  const host = getPublicRequestHost(request.headers)
  const scope = resolveRequestSessionScope(host) ?? platformSessionScope
  const tenantResolution = await resolveTenantAsync({
    hostname: request.headers.get("x-tenant-hostname") ?? host,
    slug: request.headers.get("x-tenant-subdomain"),
  })

  const credentialUser = tenantResolution.tenant
    ? await findUserByTenantSignInIdentifierAsync({
        identifier,
        tenantId: tenantResolution.tenant.id,
      })
    : identifier.includes("@")
      ? await findUserByEmailAsync({ email: identifier })
      : null
  const user = credentialUser

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

  if (!verifyPassword(password, user.passwordHash)) {
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

  const setupGate =
    membership && tenantResolution.tenant
      ? await resolveInitialMigrationSetupGate({
          role: membership.role,
          tenantId: tenantResolution.tenant.id,
        })
      : null
  const redirectPath = setupGate?.shouldRedirectAdminToSetup
    ? "/getting-started"
    : setupGate?.shouldRedirectAdminToSuccess
      ? "/onboarding-success"
      : nextPath
  const response = NextResponse.redirect(
    buildDashboardRedirectUrl(request, redirectPath)
  )
  const sessionToken = await createSignedSessionToken({
    scope,
    userId: user.id,
  })

  return setDashboardSessionCookies(response, {
    request,
    scope,
    sessionToken,
    userId: user.id,
  })
}
