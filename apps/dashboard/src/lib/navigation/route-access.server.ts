import type { CooperativeRole } from "@halaalvest/auth/roles"
import {
  findMembershipsForUserAsync,
  findUserByIdAsync,
  getActiveQaAuthorization,
  resolveTenantAsync,
} from "@halaalvest/db"
import {
  readRouteRoleSession,
  resolveRouteRole,
  type RouteRoleRequest,
} from "./route-role"

const routeRoleQueries = {
  findMembershipsForUser: findMembershipsForUserAsync,
  findUserById: findUserByIdAsync,
  getActiveQaAuthorization,
  resolveTenant: resolveTenantAsync,
}

const roleCacheTtlMs = 15_000
const roleCacheMaxEntries = 500
const roleCache = new Map<
  string,
  { expiresAt: number; role: CooperativeRole | null }
>()

/**
 * The proxy's role lookup, with a short per-process cache. A staff page load
 * prefetches every sidebar link, and each prefetch passes through the proxy;
 * the cache turns that burst into one resolution. A role change or revoked
 * session reaches soft navigations within the TTL. Full page loads still run
 * the sidebar layout's uncached check, and the API checks every call.
 */
export async function resolveCachedRouteRole(request: RouteRoleRequest) {
  const { host, sessionToken } = readRouteRoleSession(request)

  if (!sessionToken) {
    return null
  }

  const key = [
    host,
    request.tenantSlug ?? "",
    request.tenantHostname ?? "",
    sessionToken,
  ].join("\n")
  const now = Date.now()
  const cached = roleCache.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.role
  }

  const role = await resolveRouteRole(request, routeRoleQueries)

  if (roleCache.size >= roleCacheMaxEntries) {
    for (const [entryKey, entry] of roleCache) {
      if (entry.expiresAt <= now) {
        roleCache.delete(entryKey)
      }
    }

    if (roleCache.size >= roleCacheMaxEntries) {
      roleCache.clear()
    }
  }

  roleCache.set(key, { expiresAt: now + roleCacheTtlMs, role })

  return role
}
