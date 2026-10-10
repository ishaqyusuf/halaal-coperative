import {
  getSessionTokenFromCookieHeader,
  getUserIdFromCookieHeader,
  hashAuthEvidence,
  platformSessionScope,
  resolveRequestSessionScope,
  verifySignedSessionToken,
} from "@halaalvest/auth"
import { normalizeRole } from "@halaalvest/auth/roles"
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

export async function buildRequestContext(headers: Headers) {
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
    !(await isQaAuthorizationActive(
      verifiedSignedBearerSession.qaAuthorizationId
    ))
      ? null
      : verifiedSignedBearerSession
  const verifiedSignedCookieSession = await verifySignedSessionToken({
    expectedScope: sessionScope ?? platformSessionScope,
    token: cookieSessionToken,
  })
  const cookieQaAuthorizationInvalid = Boolean(
    verifiedSignedCookieSession?.qaAuthorizationId &&
    !(await isQaAuthorizationActive(
      verifiedSignedCookieSession.qaAuthorizationId
    ))
  )
  const signedCookieSession = cookieQaAuthorizationInvalid
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
  const requestedUserId = bearerToken
    ? (bearerSession?.userId ?? null)
    : cookieQaAuthorizationInvalid
      ? null
      : (headers.get("x-user-id") ??
        getUserIdFromCookieHeader({
          cookieHeader: headers.get("cookie"),
          host: requestHost,
          explicitScope: sessionScope ?? platformSessionScope,
        }))
  const userRoleOverride = bearerToken
    ? null
    : normalizeRole(headers.get("x-user-role"))
  const user = await findUserByIdAsync(requestedUserId)
  const tenantResolution = await resolveTenantAsync({
    fallbackTenantId:
      bearerSession?.tenantId ??
      (user && !user.isPlatformOwner ? user.tenantId : null),
    slug: bearerToken ? null : forwardedTenantSlug,
    hostname: bearerToken ? null : (forwardedTenantHostname ?? requestHost),
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
  const sessionToken = bearerToken
    ? bearerSession
      ? bearerToken
      : null
    : cookieQaAuthorizationInvalid
      ? null
      : (headers.get("x-session-token") ?? cookieSessionToken)
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
                bearerSession?.scope ??
                signedCookieSession?.scope ??
                sessionScope ??
                platformSessionScope,
              ...((bearerSession ?? signedCookieSession)
                ? {
                    sessionExpiresAt: (bearerSession ?? signedCookieSession)
                      ?.expiresAt,
                  }
                : {}),
              ...((bearerSession ?? signedCookieSession)?.qaAuthorizationId
                ? {
                    qaAuthorizationId: (bearerSession ?? signedCookieSession)
                      ?.qaAuthorizationId,
                  }
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
