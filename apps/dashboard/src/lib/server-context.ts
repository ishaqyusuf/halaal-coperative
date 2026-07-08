import {
  getSessionTokenFromCookieHeader,
  platformSessionScope,
  resolveRequestSessionScope,
  type SessionScope,
  verifySignedSessionToken,
} from "@halaalvest/auth"
import {
  createDbRuntime,
  findActiveMembershipAsync,
  findUserByIdAsync,
  getDashboardMetrics,
  getPendingMemberOnboardingForUser,
  getTenantOnboardingState,
  listChargeDefinitions,
  listContributions,
  listMembers,
  resolveTenantAsync,
  type MembershipRecord,
  type TenantResolution,
  type UserRecord,
} from "@halaalvest/db"
import {
  buildDashboardSnapshot,
  defaultTenantPolicy,
  productAreas,
} from "@halaalvest/domain"
import { cookies, headers } from "next/headers"

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
    user: UserRecord | null
  }
  tenant: TenantResolution["tenant"]
  tenantResolution: TenantResolution
}

type DashboardPageData = {
  dashboard: ReturnType<typeof buildDashboardSnapshot>
  hasSession: boolean
  membership: Awaited<ReturnType<typeof findActiveMembershipAsync>>
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
  auth: { user: { email: string } | null }
}) {
  const email = context.auth.user?.email.toLowerCase() ?? ""

  return process.env.NODE_ENV !== "production" || email.includes("@test.com")
}

export async function getDashboardServerContext(): Promise<DashboardServerContext> {
  const headerStore = await headers()
  const cookieStore = await cookies()
  const host = headerStore.get("host")
  const tenantSlug = headerStore.get("x-tenant-subdomain")
  const tenantHostname = headerStore.get("x-tenant-hostname")
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
  const requestedUserId = sessionPayload?.userId ?? null
  const resolvedUser = await findUserByIdAsync(requestedUserId)
  const tenantResolution = await resolveTenantAsync({
    fallbackTenantId:
      resolvedUser && !resolvedUser.isPlatformOwner
        ? resolvedUser.tenantId
        : null,
    slug: tenantSlug,
    hostname: tenantHostname ?? host,
  })
  const user =
    resolvedUser &&
    tenantResolution.tenant &&
    !resolvedUser.isPlatformOwner &&
    resolvedUser.tenantId !== tenantResolution.tenant.id
      ? null
      : resolvedUser
  const membership = await findActiveMembershipAsync({
    tenantId: tenantResolution.tenant?.id ?? user?.tenantId ?? null,
    userId: user?.id ?? null,
  })
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
      sessionToken: sessionPayload ? sessionToken : null,
      sessionScope,
      user,
    },
    tenant: tenantResolution.tenant,
    tenantResolution,
  }
}

export async function getDashboardPageData(): Promise<DashboardPageData> {
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

  const onboarding = context.tenant
    ? await getTenantOnboardingState(context.tenant.id)
    : null
  const dashboardMetrics =
    context.tenant && runtime.status === "database-configured"
      ? await getDashboardMetrics(context.tenant.id)
      : null
  const workspaceModules =
    context.tenant && runtime.status === "database-configured"
      ? await Promise.all([
          listMembers(context.tenant.id, {
            page: 1,
            pageSize: 5,
          }),
          listContributions(context.tenant.id, {
            page: 1,
            pageSize: 5,
          }),
          listChargeDefinitions(context.tenant.id),
        ]).then(([members, contributions, chargeDefinitions]) => ({
          chargeDefinitions: chargeDefinitions.slice(0, 6).map((charge) => ({
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
      : {
          chargeDefinitions: [],
          contributions: [],
          members: [],
        }

  return {
    dashboard: buildDashboardSnapshot({
      tenant: dashboardMetrics
        ? {
            ...tenant,
            memberCount: dashboardMetrics.memberCount,
          }
        : tenant,
      policy: {
        reserveBuffer: dashboardMetrics?.reserveBuffer ?? defaultTenantPolicy.reserveBuffer,
      },
      metrics: dashboardMetrics
        ? {
            activeLoans: dashboardMetrics.activeLoanCount,
            availablePool: dashboardMetrics.availablePool,
            collectionCoverage:
              dashboardMetrics.totalContributions > 0
                ? dashboardMetrics.availablePool / dashboardMetrics.totalContributions
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
