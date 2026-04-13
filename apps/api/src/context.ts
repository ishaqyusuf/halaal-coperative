import {
  getSessionTokenFromCookieHeader,
  normalizeRole,
  platformSessionScope,
  resolveRequestSessionScope,
} from "@halaal-vest/auth"
import {
  createDbRuntime,
  findActiveMembershipAsync,
  findUserByIdAsync,
  resolveTenantAsync,
} from "@halaal-vest/db"

export async function buildRequestContext(headers: Headers) {
  const requestHost = headers.get("host")
  const forwardedTenantSlug = headers.get("x-tenant-subdomain")
  const forwardedTenantHostname = headers.get("x-tenant-hostname")
  const requestedUserId = headers.get("x-user-id") ?? "user-tenant-admin-amanah"
  const userRoleOverride = normalizeRole(headers.get("x-user-role"))
  const tenantResolution = await resolveTenantAsync({
    slug: forwardedTenantSlug,
    hostname: forwardedTenantHostname ?? requestHost,
  })
  const user = await findUserByIdAsync(requestedUserId)
  const membership =
    (await findActiveMembershipAsync({
      tenantId: tenantResolution.tenant?.id ?? user?.tenantId ?? null,
      userId: user?.id ?? null,
    })) ?? null
  const sessionScope = resolveRequestSessionScope(requestHost)
  const sessionToken =
    headers.get("x-session-token") ??
    getSessionTokenFromCookieHeader({
      cookieHeader: headers.get("cookie"),
      host: requestHost,
      explicitScope: sessionScope ?? platformSessionScope,
    })
  const runtime = createDbRuntime()

  return {
    auth: {
      activeMembership: membership
        ? {
            ...membership,
            role: userRoleOverride ?? membership.role,
          }
        : null,
      session:
        user && sessionToken
          ? {
              scope: sessionScope ?? platformSessionScope,
              token: sessionToken,
              user,
            }
          : null,
    },
    request: {
      host: requestHost,
      receivedAt: new Date().toISOString(),
      sessionScope,
      tenantResolution,
    },
    runtime,
    tenant: {
      current: tenantResolution.tenant,
      domain: tenantResolution.tenantDomain,
    },
  }
}

export async function createTRPCContext(opts: { req: Request }) {
  return buildRequestContext(opts.req.headers)
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
