import {
  getSessionTokenFromCookieHeader,
  platformSessionScope,
  resolveRequestSessionScope,
  verifySignedSessionToken,
} from "@halaalvest/auth"
import { normalizeRole, type CooperativeRole } from "@halaalvest/auth/roles"
import {
  selectActiveMembership,
  type findMembershipsForUserAsync,
  type findUserByIdAsync,
  type getActiveQaAuthorization,
  type resolveTenantAsync,
} from "@halaalvest/db"
import { getPublicRequestHost } from "@/lib/request-host"

export type RouteRoleRequest = {
  cookieHeader: string | null
  headers: Headers
  tenantHostname: string | null
  tenantSlug: string | null
}

export type RouteRoleQueries = {
  findMembershipsForUser: typeof findMembershipsForUserAsync
  findUserById: typeof findUserByIdAsync
  getActiveQaAuthorization: typeof getActiveQaAuthorization
  resolveTenant: typeof resolveTenantAsync
}

export function readRouteRoleSession(request: RouteRoleRequest) {
  const host = getPublicRequestHost(request.headers)
  const sessionScope = resolveRequestSessionScope(host) ?? platformSessionScope

  return {
    host,
    sessionScope,
    sessionToken: getSessionTokenFromCookieHeader({
      cookieHeader: request.cookieHeader,
      host,
      explicitScope: sessionScope,
    }),
  }
}

/**
 * Resolves the cooperative role behind a request for the proxy's path guard.
 * It mirrors `getDashboardServerContext` (signed session, active QA
 * authorization, tenant match, active membership) in one parallel query wave:
 * when the host names no tenant, the user's own tenant is the fallback, so the
 * fallback tenant row itself is never needed. Returns `null` when there is no
 * usable session or membership.
 */
export async function resolveRouteRole(
  request: RouteRoleRequest,
  queries: RouteRoleQueries
): Promise<CooperativeRole | null> {
  const { host, sessionScope, sessionToken } = readRouteRoleSession(request)
  const session = await verifySignedSessionToken({
    expectedScope: sessionScope,
    token: sessionToken,
  })

  if (!session) {
    return null
  }

  const [qaAuthorization, user, memberships, tenantResolution] =
    await Promise.all([
      session.qaAuthorizationId
        ? queries.getActiveQaAuthorization(session.qaAuthorizationId)
        : null,
      queries.findUserById(session.userId),
      queries.findMembershipsForUser(session.userId),
      queries.resolveTenant({
        slug: request.tenantSlug,
        hostname: request.tenantHostname ?? host,
      }),
    ])

  if (!user || (session.qaAuthorizationId && !qaAuthorization)) {
    return null
  }

  const tenant = tenantResolution.tenant

  if (tenant && !user.isPlatformOwner && user.tenantId !== tenant.id) {
    return null
  }

  const membership = selectActiveMembership(
    memberships,
    tenant?.id ?? user.tenantId
  )

  return normalizeRole(membership?.role ?? null)
}
