import {
  createDbRuntime,
  getMemberByUserId,
  getMemberOperationalReadiness,
  listGuarantorRequestsForMember,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"

/** `/guarantor-approvals`: a member's own guarantor requests, nothing else. */
export async function loadGuarantorApprovalsPageData() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (context.auth.membership?.role !== "member") {
    return { state: "staff" as const }
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" as const }
  }

  const member = context.auth.user
    ? await getMemberByUserId({
        tenantId: context.tenant.id,
        userId: context.auth.user.id,
      })
    : null

  if (!member) {
    return { state: "member-profile-missing" as const }
  }

  const requests = await listGuarantorRequestsForMember({
    guarantorMemberId: member.id,
    tenantId: context.tenant.id,
  })

  // Answering needs a verified member (the action checks the same rule), so
  // say so before offering buttons. Read only when something is waiting.
  const readiness = requests.some((request) => request.status === "pending")
    ? await getMemberOperationalReadiness({
        memberId: member.id,
        tenantId: context.tenant.id,
      })
    : null

  return {
    canAnswer: readiness?.isReady ?? true,
    requests,
    state: "ready" as const,
  }
}

export type GuarantorApprovalsPageData = Awaited<
  ReturnType<typeof loadGuarantorApprovalsPageData>
>
