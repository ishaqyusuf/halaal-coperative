import {
  createSignedSessionToken,
  platformSessionScope,
  resolveRequestSessionScope,
} from "@halaalvest/auth"
import type { MembershipRole } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import { buildDashboardRedirectUrl } from "@/lib/auth-redirect"
import { setDashboardSessionCookies } from "@/lib/auth-session-cookies"
import { getPublicRequestHost } from "@/lib/request-host"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export const workspaceSessionHandoffSuccessPath =
  "/getting-started?step=setup-mode"

/**
 * Database lookups the handoff needs. The route passes the real
 * `@halaalvest/db` functions; tests pass fakes so no module mocking leaks
 * between test files.
 */
export type WorkspaceSessionHandoffDeps = {
  consumeWorkspaceSessionHandoff: (input: {
    tenantId: string
    token: string
  }) => Promise<{ userId: string } | null>
  findActiveMembershipAsync: (input: {
    tenantId: string
    userId: string
  }) => Promise<{ role: MembershipRole; tenantId: string } | null>
  findUserByIdAsync: (
    userId: string
  ) => Promise<{ id: string; tenantId: string } | null>
  resolveTenantAsync: (input: {
    hostname: string | null
    slug: string | null
  }) => Promise<{ tenant: { id: string } | null }>
}

function withHandoffHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store")
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}

/** Generic failure: back to sign-in with no hint about what went wrong. */
export function redirectWorkspaceSessionHandoffToLogin(request: NextRequest) {
  return withHandoffHeaders(
    NextResponse.redirect(buildDashboardRedirectUrl(request, "/login"), 303)
  )
}

async function signInWithHandoff(
  request: NextRequest,
  deps: WorkspaceSessionHandoffDeps
) {
  const formData = await request.formData()
  const token = formData.get("token")
  if (typeof token !== "string" || !token) return null

  const host = getPublicRequestHost(request.headers)
  const scope = resolveRequestSessionScope(host)
  if (scope === platformSessionScope) return null

  const { tenant } = await deps.resolveTenantAsync({
    hostname: request.headers.get("x-tenant-hostname") ?? host,
    slug: request.headers.get("x-tenant-subdomain"),
  })
  if (!tenant) return null

  // Burn first: a token is single-use even if a later check rejects it.
  const handoff = await deps.consumeWorkspaceSessionHandoff({
    tenantId: tenant.id,
    token,
  })
  if (!handoff) return null

  // findUserByIdAsync excludes soft-deleted users.
  const user = await deps.findUserByIdAsync(handoff.userId)
  if (!user || user.id !== handoff.userId || user.tenantId !== tenant.id) {
    return null
  }

  const membership = await deps.findActiveMembershipAsync({
    tenantId: tenant.id,
    userId: user.id,
  })
  if (
    !membership ||
    membership.tenantId !== tenant.id ||
    !hasAnyRole(membership.role, workspaceAdminRoles)
  ) {
    return null
  }

  const sessionToken = await createSignedSessionToken({
    scope,
    userId: user.id,
  })
  const response = NextResponse.redirect(
    buildDashboardRedirectUrl(request, workspaceSessionHandoffSuccessPath),
    303
  )

  return withHandoffHeaders(
    setDashboardSessionCookies(response, {
      request,
      scope,
      sessionToken,
      userId: user.id,
    })
  )
}

/**
 * POST /auth/handoff: exchanges a one-time marketing onboarding token for a
 * dashboard session on the tenant host. Every failure, including thrown
 * errors, is a 303 to /login.
 */
export async function handleWorkspaceSessionHandoffPost(
  request: NextRequest,
  deps: WorkspaceSessionHandoffDeps
) {
  try {
    return (
      (await signInWithHandoff(request, deps)) ??
      redirectWorkspaceSessionHandoffToLogin(request)
    )
  } catch (error) {
    // Never log the request body: it carries the handoff token.
    console.error(
      "[auth/handoff] sign-in handoff failed",
      error instanceof Error ? error.name : typeof error
    )
    return redirectWorkspaceSessionHandoffToLogin(request)
  }
}
