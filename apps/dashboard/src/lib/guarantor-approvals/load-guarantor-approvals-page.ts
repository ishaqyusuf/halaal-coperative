import {
  createDbRuntime,
  getMemberByUserId,
  listMemberLoanGuarantorApprovals,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"

export async function loadGuarantorApprovalsPageData() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canUseMemberGuarantors = context.auth.membership?.role === "member"

  if (!canUseMemberGuarantors) {
    return { state: "restricted" as const }
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" as const }
  }

  if (!context.auth.user) {
    return { state: "member-sign-in-required" as const }
  }

  const member = await getMemberByUserId({
    tenantId: context.tenant.id,
    userId: context.auth.user.id,
  })

  if (!member) {
    return { state: "member-profile-missing" as const }
  }

  const approvals = await listMemberLoanGuarantorApprovals({
    guarantorMemberId: member.id,
    tenantId: context.tenant.id,
  })

  return {
    state: "ready" as const,
    approvals,
  }
}
