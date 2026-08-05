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
  findMembershipsForUserAsync,
  findUserByIdAsync,
  resolveTenantAsync,
  type MembershipRecord,
} from "@halaalvest/db"
import { randomUUID } from "node:crypto"

function getRequestId(headers: Headers) {
  const supplied = headers.get("x-request-id")?.trim()
  return supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied)
    ? supplied
    : randomUUID()
}

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
  const userRoleOverride = bearerSession
    ? null
    : normalizeRole(headers.get("x-user-role"))
  const user = await findUserByIdAsync(requestedUserId)
  const tenantResolution = await resolveTenantAsync({
    fallbackTenantId:
      bearerSession?.tenantId ??
      (user && !user.isPlatformOwner ? user.tenantId : null),
    slug: bearerSession ? null : forwardedTenantSlug,
    hostname: bearerSession ? null : (forwardedTenantHostname ?? requestHost),
  })
  const userMemberships = await findMembershipsForUserAsync(user?.id)
  const signedMembership = bearerSession?.membershipId
    ? (userMemberships.find(
        (membership) =>
          membership.id === bearerSession.membershipId &&
          (!tenantResolution.tenant ||
            membership.tenantId === tenantResolution.tenant.id)
      ) ?? null)
    : undefined
  const fallbackMembership = tenantResolution.tenant
    ? (userMemberships.find(
        (membership) => membership.tenantId === tenantResolution.tenant?.id
      ) ?? null)
    : (userMemberships.find((membership) => membership.isDefault) ??
      userMemberships[0] ??
      null)
  const resolvedMembership =
    signedMembership ??
    (bearerSession?.membershipId ? null : fallbackMembership)
  const membership =
    resolvedMembership ??
    (user?.isPlatformOwner &&
    tenantResolution.tenant &&
    !bearerSession?.membershipId
      ? ({
          id: "platform-owner-context-membership",
          isDefault: true,
          role: "super_admin",
          tenantId: tenantResolution.tenant.id,
          userId: user.id,
        } satisfies MembershipRecord)
      : null)
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
      requestId: getRequestId(headers),
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
