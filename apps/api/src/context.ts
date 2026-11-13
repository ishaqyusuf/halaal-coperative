import {
  getSessionTokenFromCookieHeader,
  getUserIdFromCookieHeader,
  hashAuthEvidence,
  platformSessionScope,
  resolveRequestSessionScope,
  verifySignedSessionToken,
} from "@halaalvest/auth"
import {
  createDbRuntime,
  findMembershipsForUserAsync,
  findUserByIdAsync,
  isQaAuthorizationActive,
  resolveTenantAsync,
  validateMobileDeviceSession,
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

function getNetworkSignal(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unavailable"
  )
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null
}

/**
 * The public origin the caller reached, honouring the proxy's forwarded
 * scheme and host (Portless and Vercel terminate TLS in front of the app).
 * Links in emails are built from it so they keep the scheme and port the
 * user actually uses. Returns null when the headers name no usable origin.
 */
export function getRequestOrigin(headers: Headers) {
  const protocol = firstForwardedValue(headers.get("x-forwarded-proto"))
    ?.replace(/:$/, "")
    .toLowerCase()
  const host =
    firstForwardedValue(headers.get("x-forwarded-host")) ??
    firstForwardedValue(headers.get("host"))

  if (!host || (protocol !== "http" && protocol !== "https")) {
    return null
  }

  return `${protocol}://${host}`
}

/**
 * The database lookups the request context makes. A caller that already
 * resolves the same session in the same request (the dashboard's server
 * render) passes request-cached versions so identical lookups run once.
 * Auth rules stay here; only the data access is shared.
 */
export type RequestContextLookups = {
  findMembershipsForUser: typeof findMembershipsForUserAsync
  findUserById: typeof findUserByIdAsync
  isQaAuthorizationActive: typeof isQaAuthorizationActive
  resolveTenant: typeof resolveTenantAsync
}

const defaultRequestContextLookups: RequestContextLookups = {
  findMembershipsForUser: findMembershipsForUserAsync,
  findUserById: findUserByIdAsync,
  isQaAuthorizationActive,
  resolveTenant: resolveTenantAsync,
}

export async function buildRequestContext(
  headers: Headers,
  lookups: RequestContextLookups = defaultRequestContextLookups
) {
  const requestHost = headers.get("host")
  const isMobileRequest =
    headers.get("x-trpc-source")?.trim().toLowerCase() === "mobile"
  const forwardedTenantSlug = headers.get("x-tenant-subdomain")
  const forwardedTenantHostname = headers.get("x-tenant-hostname")
  const sessionScope = resolveRequestSessionScope(requestHost)
  const bearerToken = getBearerToken(headers)
  const cookieSessionToken = bearerToken
    ? null
    : getSessionTokenFromCookieHeader({
        cookieHeader: headers.get("cookie"),
        host: requestHost,
        explicitScope: sessionScope ?? platformSessionScope,
      })
  const runtime = createDbRuntime()
  const verifiedSignedBearerSession = await verifySignedSessionToken({
    token: bearerToken,
  })
  const signedBearerSession =
    verifiedSignedBearerSession?.qaAuthorizationId &&
    !(await lookups.isQaAuthorizationActive(
      verifiedSignedBearerSession.qaAuthorizationId
    ))
      ? null
      : verifiedSignedBearerSession
  const verifiedSignedCookieSession = await verifySignedSessionToken({
    expectedScope: sessionScope ?? platformSessionScope,
    token: cookieSessionToken,
  })
  // The unsigned user cookie is only a consistency hint: the signed payload
  // names the user, and a contradicting hint invalidates the session.
  const cookieUserHint = verifiedSignedCookieSession
    ? getUserIdFromCookieHeader({
        cookieHeader: headers.get("cookie"),
        host: requestHost,
        explicitScope: sessionScope ?? platformSessionScope,
      })
    : null
  const signedCookieSession =
    !verifiedSignedCookieSession ||
    (cookieUserHint && cookieUserHint !== verifiedSignedCookieSession.userId) ||
    (verifiedSignedCookieSession.qaAuthorizationId &&
      !(await lookups.isQaAuthorizationActive(
        verifiedSignedCookieSession.qaAuthorizationId
      )))
      ? null
      : verifiedSignedCookieSession
  const mobileDeviceId = headers.get("x-mobile-device-id")?.trim() || null
  const durableMobileSession =
    bearerToken &&
    signedBearerSession?.sessionKind === "mobile" &&
    mobileDeviceId &&
    runtime.status === "database-configured"
      ? await validateMobileDeviceSession({
          deviceIdHash: hashAuthEvidence(`mobile-device:${mobileDeviceId}`),
          membershipId: signedBearerSession.membershipId,
          tenantId: signedBearerSession.tenantId,
          tokenHash: hashAuthEvidence(`mobile-session:${bearerToken}`),
          userId: signedBearerSession.userId,
        })
      : null
  const canUseNonDurableMobileSession =
    runtime.status !== "database-configured" &&
    process.env.NODE_ENV !== "production"
  const bearerSession = isMobileRequest
    ? signedBearerSession?.sessionKind === "mobile" &&
      (durableMobileSession || canUseNonDurableMobileSession)
      ? signedBearerSession
      : null
    : signedBearerSession?.sessionKind !== "mobile"
      ? signedBearerSession
      : durableMobileSession || canUseNonDurableMobileSession
        ? signedBearerSession
        : null
  // Identity and role come only from a verified signed session. Client headers
  // such as x-user-id, x-session-token and x-user-role are never trusted.
  const signedSession = bearerSession ?? signedCookieSession
  const user = await lookups.findUserById(signedSession?.userId ?? null)
  // Both lookups depend only on the verified user, so they run together.
  const [tenantResolution, userMemberships] = await Promise.all([
    lookups.resolveTenant({
      fallbackTenantId:
        bearerSession?.tenantId ??
        (user && !user.isPlatformOwner ? user.tenantId : null),
      slug: bearerToken ? null : forwardedTenantSlug,
      hostname: bearerToken ? null : (forwardedTenantHostname ?? requestHost),
    }),
    lookups.findMembershipsForUser(user?.id),
  ])
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
  const sessionToken = bearerSession
    ? bearerToken
    : signedCookieSession
      ? cookieSessionToken
      : null
  return {
    auth: {
      activeMembership: membership,
      session:
        user && signedSession && sessionToken
          ? {
              scope: signedSession.scope,
              sessionExpiresAt: signedSession.expiresAt,
              ...(signedSession.qaAuthorizationId
                ? { qaAuthorizationId: signedSession.qaAuthorizationId }
                : {}),
              token: sessionToken,
              user,
              ...(durableMobileSession
                ? { mobileDeviceSessionId: durableMobileSession.id }
                : {}),
            }
          : null,
    },
    request: {
      mobileAuthenticated: bearerSession?.sessionKind === "mobile",
      deviceSignal: mobileDeviceId || "unavailable",
      mobile: {
        appVersion:
          headers.get("x-mobile-app-version")?.trim().slice(0, 80) || "unknown",
        buildVariant:
          headers.get("x-mobile-build-variant")?.trim().slice(0, 80) ||
          "unknown",
        deviceLabel:
          headers.get("x-mobile-device-label")?.trim().slice(0, 160) ||
          "Mobile device",
        platform:
          headers.get("x-mobile-platform")?.trim().slice(0, 40) || "unknown",
      },
      host: requestHost,
      networkSignal: getNetworkSignal(headers),
      origin: getRequestOrigin(headers),
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
