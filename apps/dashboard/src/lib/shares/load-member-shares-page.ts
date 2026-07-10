import {
  createDbRuntime,
  getMemberByUserId,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
  listMemberShareApplications,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"

export async function loadMemberSharesPageData() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const tenantId = context.tenant?.id
  const canUseMemberShares = context.auth.membership?.role === "member"

  if (!canUseMemberShares) {
    return { state: "restricted" as const }
  }

  if (!tenantId || runtime.status !== "database-configured") {
    return { state: "unavailable" as const }
  }

  if (!context.auth.user) {
    return { state: "member-sign-in-required" as const }
  }

  const member = await getMemberByUserId({
    tenantId,
    userId: context.auth.user.id,
  })

  if (!member) {
    return { state: "member-profile-missing" as const }
  }

  const policy = await getTenantSharePolicy(tenantId)

  if (policy.configurationMode !== "unit_based") {
    return { state: "unit-model-inactive" as const }
  }

  const [applications, position] = await Promise.all([
    listMemberShareApplications({
      memberId: member.id,
      tenantId,
    }),
    getMemberUnitSharePosition({
      memberId: member.id,
      tenantId,
    }),
  ])

  return {
    state: "ready" as const,
    applications,
    member,
    policy,
    position,
  }
}
