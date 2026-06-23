import {
  getSessionTokenFromCookieHeader,
  getUserIdFromCookieHeader,
  platformSessionScope,
  resolveRequestSessionScope,
} from "@halaalvest/auth"
import { normalizeRole } from "@halaalvest/auth/roles"
import {
  createDbRuntime,
  findActiveMembershipAsync,
  findUserByIdAsync,
  resolveTenantAsync,
} from "@halaalvest/db"

export async function buildRequestContext(headers: Headers) {
  const requestHost = headers.get("host")
  const forwardedTenantSlug = headers.get("x-tenant-subdomain")
  const forwardedTenantHostname = headers.get("x-tenant-hostname")
  const sessionScope = resolveRequestSessionScope(requestHost)
  const requestedUserId =
    headers.get("x-user-id") ??
    getUserIdFromCookieHeader({
      cookieHeader: headers.get("cookie"),
      host: requestHost,
      explicitScope: sessionScope ?? platformSessionScope,
    })
  const userRoleOverride = normalizeRole(headers.get("x-user-role"))
  const user = await findUserByIdAsync(requestedUserId)
  const tenantResolution = await resolveTenantAsync({
    fallbackTenantId: user && !user.isPlatformOwner ? user.tenantId : null,
    slug: forwardedTenantSlug,
    hostname: forwardedTenantHostname ?? requestHost,
  })
  const membership =
    (await findActiveMembershipAsync({
      tenantId: tenantResolution.tenant?.id ?? user?.tenantId ?? null,
      userId: user?.id ?? null,
    })) ?? null
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
