import {
  getSessionTokenFromCookieHeader,
  platformSessionScope,
  resolveRequestSessionScope,
  type SessionScope,
  verifySignedSessionToken,
} from "@halaalvest/auth"
import {
  getPendingMemberOnboardingForUser,
  selectActiveMembership,
  type MembershipRecord,
  type TenantResolution,
  type UserRecord,
} from "@halaalvest/db"
import {
  resolveQaQuickFillContext,
  type QaQuickFillContext,
} from "@halaalvest/utils"
import { cookies, headers } from "next/headers"
import { cache } from "react"
import { getPublicRequestHost } from "@/lib/request-host"
import {
  findRequestMemberships,
  findRequestUser,
  getRequestQaAuthorization,
  resolveRequestTenant,
} from "@/lib/request-lookups"

type DashboardServerContext = {
  auth: {
    membership: MembershipRecord | null
    pendingMemberOnboarding: {
      email: string
      fullName: string
      id: string
      memberNumber: string
      status: string
    } | null
    sessionScope: SessionScope | null
    sessionToken: string | null
    qaDomain: string | null
    user: UserRecord | null
  }
  tenant: TenantResolution["tenant"]
  tenantResolution: TenantResolution
}

export function canShowQuickFill(context: {
  auth: { qaDomain?: string | null; user: { email: string } | null }
}) {
  return getQaQuickFillContext(context).enabled
}

export function getQaQuickFillContext(context: {
  auth: { qaDomain?: string | null; user: { email: string } | null }
}): QaQuickFillContext {
  const qaDomain = context.auth.qaDomain?.trim().toLowerCase() ?? null
  return resolveQaQuickFillContext({
    authenticatedEmail: qaDomain ? `authorized@${qaDomain}` : null,
    // The session's QA Domain was authorized against Oversight's policy.
    configuredDomains: qaDomain ? [qaDomain] : [],
    isDevelopment: false,
  })
}

type DashboardRequestSession = {
  host: string
  qaAuthorizationId: string | null
  requestedUserId: string | null
  sessionScope: SessionScope | null
  sessionToken: string | null
  tenantHostname: string | null
  tenantSlug: string | null
}

/**
 * Reads the request headers and verifies the signed session cookie. It makes
 * no database calls; identity comes only from the signed session payload.
 */
const getDashboardRequestSession = cache(
  async (): Promise<DashboardRequestSession> => {
    const [headerStore, cookieStore] = await Promise.all([headers(), cookies()])
    const host = getPublicRequestHost(headerStore)
    const sessionScope = resolveRequestSessionScope(host)
    const sessionToken = getSessionTokenFromCookieHeader({
      cookieHeader: cookieStore.toString(),
      host,
      explicitScope: sessionScope ?? platformSessionScope,
    })
    const sessionPayload = await verifySignedSessionToken({
      expectedScope: sessionScope ?? platformSessionScope,
      token: sessionToken,
    })

    return {
      host,
      qaAuthorizationId: sessionPayload?.qaAuthorizationId ?? null,
      requestedUserId: sessionPayload?.userId ?? null,
      sessionScope,
      sessionToken: sessionPayload ? sessionToken : null,
      tenantHostname: headerStore.get("x-tenant-hostname"),
      tenantSlug: headerStore.get("x-tenant-subdomain"),
    }
  }
)

export async function hasVerifiedDashboardSession() {
  return Boolean((await getDashboardRequestSession()).sessionToken)
}

/**
 * Quick Fill only needs the QA authorization behind the signed session, so
 * the root layout resolves that instead of the full server context.
 */
export async function getRequestQaQuickFillContext() {
  const session = await getDashboardRequestSession()
  const qaAuthorization = await getRequestQaAuthorization(
    session.qaAuthorizationId
  )
  return getQaQuickFillContext({
    auth: { qaDomain: qaAuthorization?.qaDomain ?? null, user: null },
  })
}

/**
 * Resolves the session, tenant and membership once per request. Layouts,
 * pages and loaders all call this, and React `cache()` shares the result.
 */
export const getDashboardServerContext = cache(
  async (): Promise<DashboardServerContext> => {
    const session = await getDashboardRequestSession()
    // The QA authorization check and the user lookup are independent; a
    // session whose QA authorization is no longer active resolves no user.
    const [qaAuthorization, requestedUser] = await Promise.all([
      getRequestQaAuthorization(session.qaAuthorizationId),
      findRequestUser(session.requestedUserId),
    ])
    const isSessionActive = Boolean(
      session.sessionToken && (!session.qaAuthorizationId || qaAuthorization)
    )
    const resolvedUser = isSessionActive ? requestedUser : null
    const [tenantResolution, userMemberships] = await Promise.all([
      resolveRequestTenant({
        fallbackTenantId:
          resolvedUser && !resolvedUser.isPlatformOwner
            ? resolvedUser.tenantId
            : null,
        slug: session.tenantSlug,
        hostname: session.tenantHostname ?? session.host,
      }),
      findRequestMemberships(resolvedUser?.id ?? null),
    ])
    const user =
      resolvedUser &&
      tenantResolution.tenant &&
      !resolvedUser.isPlatformOwner &&
      resolvedUser.tenantId !== tenantResolution.tenant.id
        ? null
        : resolvedUser
    const membership = user
      ? selectActiveMembership(
          userMemberships,
          tenantResolution.tenant?.id ?? user.tenantId
        )
      : null

    return {
      auth: {
        membership,
        pendingMemberOnboarding:
          user && tenantResolution.tenant
            ? await getPendingMemberOnboardingForUser({
                tenantId: tenantResolution.tenant.id,
                userId: user.id,
              })
            : null,
        sessionToken: isSessionActive ? session.sessionToken : null,
        sessionScope: session.sessionScope,
        qaDomain: qaAuthorization?.qaDomain ?? null,
        user,
      },
      tenant: tenantResolution.tenant,
      tenantResolution,
    }
  }
)
