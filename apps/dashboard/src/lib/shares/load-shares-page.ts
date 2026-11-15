import {
  createDbRuntime,
  getMemberByUserId,
  getMemberShareSummary,
  getTenantSharePolicy,
  getTenantShareSummary,
  isMemberOperationallyReady,
  listMemberShareApplicationPage,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

export const memberShareRequestPageSize = 20

/**
 * /shares for both audiences. Members get their own figures and requests
 * (resolved once from the session); finance staff get the cooperative's
 * waiting count and share capital, with the request list prefetched by the
 * route. Profit stays a separate figure (ADR-032).
 */
export async function loadSharesPageData() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const tenantId = context.tenant?.id
  const role = context.auth.membership?.role

  if (!tenantId || runtime.status !== "database-configured") {
    return { state: "unavailable" as const }
  }

  if (role !== "member") {
    if (!hasAnyRole(role, financeManagementRoles)) {
      return { state: "restricted" as const }
    }

    const [policy, summary] = await Promise.all([
      getTenantSharePolicy(tenantId),
      getTenantShareSummary(tenantId),
    ])

    return { policy, state: "staff" as const, summary }
  }

  const member = context.auth.user
    ? await getMemberByUserId({ tenantId, userId: context.auth.user.id })
    : null

  if (!member) {
    return { state: "member-profile-missing" as const }
  }

  const policy = await getTenantSharePolicy(tenantId)
  const isUnitBased = policy.configurationMode === "unit_based"
  const [summary, isReady, requests] = await Promise.all([
    getMemberShareSummary({ memberId: member.id, policy, tenantId }),
    isUnitBased ? isMemberOperationallyReady({ member, tenantId }) : null,
    isUnitBased
      ? listMemberShareApplicationPage({
          memberId: member.id,
          pageSize: memberShareRequestPageSize,
          tenantId,
        })
      : null,
  ])

  return {
    policy,
    requestBlocked: isUnitBased && !isReady,
    requests: requests?.data ?? [],
    state: "member" as const,
    summary,
  }
}

export type SharesPageData = Awaited<ReturnType<typeof loadSharesPageData>>
