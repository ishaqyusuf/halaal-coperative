import type { RequestContextLookups } from "@halaalvest/api/context"
import {
  findMembershipsForUserAsync,
  findUserByIdAsync,
  getActiveQaAuthorization,
  resolveTenantAsync,
} from "@halaalvest/db"
import { cache } from "react"

// Session lookups shared by everything that resolves the request's session
// during one server render: `getDashboardServerContext` (layouts, pages,
// loaders) and the server tRPC context (prefetches and server callers).
// React `cache()` keys on the arguments, so a lookup is shared only when its
// inputs match exactly; each resolver keeps its own auth rules. Outside a
// server render (route handlers) `cache()` does not memoize.

export const getRequestQaAuthorization = cache(
  async (qaAuthorizationId: string | null) =>
    qaAuthorizationId ? getActiveQaAuthorization(qaAuthorizationId) : null
)

export const findRequestUser = cache((userId: string | null) =>
  findUserByIdAsync(userId)
)

export const findRequestMemberships = cache((userId: string | null) =>
  findMembershipsForUserAsync(userId)
)

// Primitive arguments, so equal inputs share one cache entry.
const resolveRequestTenantByKey = cache(
  (
    fallbackTenantId: string | null,
    slug: string | null,
    hostname: string | null
  ) => resolveTenantAsync({ fallbackTenantId, hostname, slug })
)

export function resolveRequestTenant(input: {
  fallbackTenantId?: string | null
  hostname?: string | null
  slug?: string | null
}) {
  return resolveRequestTenantByKey(
    input.fallbackTenantId ?? null,
    input.slug ?? null,
    input.hostname ?? null
  )
}

export const requestContextLookups: RequestContextLookups = {
  findMembershipsForUser: (userId) => findRequestMemberships(userId ?? null),
  findUserById: (userId) => findRequestUser(userId ?? null),
  isQaAuthorizationActive: async (qaAuthorizationId) =>
    Boolean(await getRequestQaAuthorization(qaAuthorizationId)),
  resolveTenant: resolveRequestTenant,
}
