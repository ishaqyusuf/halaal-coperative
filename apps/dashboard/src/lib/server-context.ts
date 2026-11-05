import {
  getSessionTokenFromCookieHeader,
  platformSessionScope,
  resolveRequestSessionScope,
  type SessionScope,
  verifySignedSessionToken,
} from "@halaalvest/auth"
import {
  createDbRuntime,
  findMembershipsForUserAsync,
  findUserByIdAsync,
  getActiveQaAuthorization,
  getDashboardMetrics,
  getPendingMemberOnboardingForUser,
  getTenantOnboardingState,
  listChargeDefinitions,
  listContributions,
  listMembers,
  resolveTenantAsync,
  selectActiveMembership,
  type MembershipRecord,
  type TenantResolution,
  type UserRecord,
} from "@halaalvest/db"
import {
  buildDashboardSnapshot,
  defaultTenantPolicy,
  productAreas,
} from "@halaalvest/domain"
import { getServerQaEmailDomains } from "@halaalvest/notifications/server"
import {
  resolveQaQuickFillContext,
  type QaQuickFillContext,
} from "@halaalvest/utils"
import { cookies, headers } from "next/headers"
import { cache } from "react"
import { getPublicRequestHost } from "@/lib/request-host"

type DashboardMemberRow = {
  id: string
  fullName: string
  memberNumber: string
  memberType: string
  status: string
}

type DashboardContributionRow = {
  id: string
  memberName: string
  amount: number
  channel: string
  status: string
  postedAt: string
}

type DashboardChargeDefinitionRow = {
  id: string
  name: string
  code: string
  kind: string
  isActive: boolean
  amount: number
}

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

type DashboardPageData = {
  dashboard: ReturnType<typeof buildDashboardSnapshot>
  hasSession: boolean
  membership: MembershipRecord | null
  onboarding: Awaited<ReturnType<typeof getTenantOnboardingState>> | null
  productAreas: typeof productAreas
  runtime: ReturnType<typeof createDbRuntime>
  tenant: {
    id: string
    slug: string
    name: string
    memberNumberPrefix?: string | null
    currentSize?: number | null
    officeAddress?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    startDate?: string | null
    region: string | null
    currencyCode: string
    timezone: string
    status: "pending" | "active" | "suspended" | "archived"
    memberCount: number
  }
  tenantResolution: Awaited<ReturnType<typeof resolveTenantAsync>>
  workspaceModules: {
    chargeDefinitions: DashboardChargeDefinitionRow[]
    contributions: DashboardContributionRow[]
    members: DashboardMemberRow[]
  }
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
    configuredDomains: qaDomain
      ? [...new Set([...getServerQaEmailDomains(), qaDomain])]
      : getServerQaEmailDomains(),
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

const getRequestQaAuthorization = cache(
  async (qaAuthorizationId: string | null) =>
    qaAuthorizationId ? getActiveQaAuthorization(qaAuthorizationId) : null
)

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
      findUserByIdAsync(session.requestedUserId),
    ])
    const isSessionActive = Boolean(
      session.sessionToken && (!session.qaAuthorizationId || qaAuthorization)
    )
    const resolvedUser = isSessionActive ? requestedUser : null
    const [tenantResolution, userMemberships] = await Promise.all([
      resolveTenantAsync({
        fallbackTenantId:
          resolvedUser && !resolvedUser.isPlatformOwner
            ? resolvedUser.tenantId
            : null,
        slug: session.tenantSlug,
        hostname: session.tenantHostname ?? session.host,
      }),
      findMembershipsForUserAsync(resolvedUser?.id),
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

async function loadWorkspaceModules(
  tenantId: string
): Promise<DashboardPageData["workspaceModules"]> {
  return Promise.all([
    listMembers(tenantId, {
      page: 1,
      pageSize: 5,
    }),
    listContributions(tenantId, {
      page: 1,
      pageSize: 5,
    }),
    listChargeDefinitions(tenantId),
  ]).then(([members, contributions, chargeDefinitions]) => ({
    chargeDefinitions: chargeDefinitions.slice(0, 6).map((charge: any) => ({
      id: charge.id,
      name: charge.name,
      code: charge.code,
      kind: charge.kind,
      isActive: charge.isActive,
      amount: Number(charge.amount),
    })),
    contributions: contributions.items.map((contribution) => ({
      id: contribution.id,
      memberName: contribution.member?.fullName ?? "Unknown member",
      amount: Number(contribution.amount),
      channel: contribution.channel,
      status: contribution.status,
      postedAt: contribution.postedAt.toISOString(),
    })),
    members: members.items.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      memberNumber: member.memberNumber,
      memberType: member.memberType,
      status: member.status,
    })),
  }))
}

export const getDashboardPageData = cache(
  async (): Promise<DashboardPageData> => {
    const context = await getDashboardServerContext()
    const runtime = createDbRuntime()
    const tenant =
      context.tenant ??
      ({
        id: "platform-demo",
        slug: "platform",
        name: "Platform Demo Workspace",
        memberNumberPrefix: null,
        currentSize: null,
        officeAddress: null,
        city: null,
        state: null,
        country: null,
        startDate: null,
        region: null,
        currencyCode: "NGN",
        timezone: "Africa/Lagos",
        status: "active",
        memberCount: 0,
      } as const)

    const hasDatabase = runtime.status === "database-configured"
    const [onboarding, dashboardMetrics, workspaceModules] = await Promise.all([
      context.tenant ? getTenantOnboardingState(context.tenant.id) : null,
      context.tenant && hasDatabase
        ? getDashboardMetrics(context.tenant.id)
        : null,
      context.tenant && hasDatabase
        ? loadWorkspaceModules(context.tenant.id)
        : {
            chargeDefinitions: [],
            contributions: [],
            members: [],
          },
    ])

    return {
      dashboard: buildDashboardSnapshot({
        tenant: dashboardMetrics
          ? {
              ...tenant,
              memberCount: dashboardMetrics.memberCount,
            }
          : tenant,
        policy: {
          reserveBuffer:
            dashboardMetrics?.reserveBuffer ??
            defaultTenantPolicy.reserveBuffer,
        },
        metrics: dashboardMetrics
          ? {
              activeLoans: dashboardMetrics.activeLoanCount,
              availablePool: dashboardMetrics.availablePool,
              collectionCoverage:
                dashboardMetrics.totalContributions > 0
                  ? dashboardMetrics.availablePool /
                    dashboardMetrics.totalContributions
                  : 0,
              delinquencyRate: dashboardMetrics.delinquencyRate,
              monthlyContributionTarget: dashboardMetrics.totalContributions,
            }
          : undefined,
      }),
      hasSession: Boolean(context.auth.sessionToken && context.auth.user),
      membership: context.auth.membership,
      onboarding,
      productAreas,
      runtime,
      tenant,
      tenantResolution: context.tenantResolution,
      workspaceModules,
    }
  }
)
