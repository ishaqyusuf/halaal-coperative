import { getSessionTokenFromCookieHeader, platformSessionScope, resolveRequestSessionScope } from "@halaal-vest/auth"
import {
  createDbRuntime,
  findActiveMembershipAsync,
  findUserByIdAsync,
  getTenantOnboardingState,
  listChargeDefinitions,
  listContributions,
  listMembers,
  resolveTenantAsync,
} from "@halaal-vest/db"
import { buildDashboardSnapshot, defaultTenantPolicy, productAreas } from "@halaal-vest/domain"
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

export async function getDashboardServerContext() {
  const headerStore = await headers()
  const cookieStore = await cookies()
  const host = headerStore.get("host")
  const tenantSlug = headerStore.get("x-tenant-subdomain")
  const tenantHostname = headerStore.get("x-tenant-hostname")
  const requestedUserId = headerStore.get("x-user-id") ?? "user-tenant-admin-amanah"
  const tenantResolution = await resolveTenantAsync({
    slug: tenantSlug,
    hostname: tenantHostname ?? host,
  })
  const user = await findUserByIdAsync(requestedUserId)
  const membership = await findActiveMembershipAsync({
    tenantId: tenantResolution.tenant?.id ?? user?.tenantId ?? null,
    userId: user?.id ?? null,
  })
  const sessionScope = resolveRequestSessionScope(host)
  const sessionToken =
    headerStore.get("x-session-token") ??
    getSessionTokenFromCookieHeader({
      cookieHeader: cookieStore.toString(),
      host,
      explicitScope: sessionScope ?? platformSessionScope,
    })

  return {
    auth: {
      membership,
      sessionToken,
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
      region: null,
      currencyCode: "NGN",
      timezone: "Africa/Lagos",
      status: "active",
      memberCount: 0,
    } as const)

  const onboarding = context.tenant ? await getTenantOnboardingState(context.tenant.id) : null
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
      tenant,
      policy: {
        reserveBuffer: defaultTenantPolicy.reserveBuffer,
      },
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
