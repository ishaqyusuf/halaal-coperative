import {
  createDbRuntime,
  getMemberByUserId,
  getMemberOperationalReadiness,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
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

  const [position, readiness] = await Promise.all([
    getMemberUnitSharePosition({
      memberId: member.id,
      tenantId,
    }),
    getMemberOperationalReadiness({
      memberId: member.id,
      tenantId,
    }),
  ])

  return {
    state: "ready" as const,
    member,
    policy,
    position,
    requestBlockedReason: readiness?.isReady
      ? null
      : "Complete member verification and migration setup before requesting optional shares.",
  }
}
