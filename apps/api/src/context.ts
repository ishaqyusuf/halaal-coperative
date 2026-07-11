import {
  getSessionTokenFromCookieHeader,
  getUserIdFromCookieHeader,
  platformSessionScope,
  resolveRequestSessionScope,
  verifySignedSessionToken,
} from "@halaalvest/auth"
import { normalizeRole } from "@halaalvest/auth/roles"
import {
  createDbRuntime,
  findActiveMembershipAsync,
  findUserByIdAsync,
  resolveTenantAsync,
} from "@halaalvest/db"

function getBearerToken(headers: Headers) {
  const authorization = headers.get("authorization")
  const [scheme, token] = authorization?.split(" ") ?? []

  return scheme?.toLowerCase() === "bearer" && token ? token : null
}

export async function buildRequestContext(headers: Headers) {
  const requestHost = headers.get("host")
  const forwardedTenantSlug = headers.get("x-tenant-subdomain")
  const forwardedTenantHostname = headers.get("x-tenant-hostname")
  const sessionScope = resolveRequestSessionScope(requestHost)
  const bearerToken = getBearerToken(headers)
  const bearerSession = await verifySignedSessionToken({
    token: bearerToken,
  })
  const requestedUserId =
    bearerSession?.userId ??
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
    bearerSession && bearerToken
      ? bearerToken
      : (headers.get("x-session-token") ??
        getSessionTokenFromCookieHeader({
          cookieHeader: headers.get("cookie"),
          host: requestHost,
          explicitScope: sessionScope ?? platformSessionScope,
        }))
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
              scope:
                bearerSession?.scope ?? sessionScope ?? platformSessionScope,
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
