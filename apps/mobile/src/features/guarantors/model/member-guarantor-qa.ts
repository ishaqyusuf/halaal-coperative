import {
  createCooperativeServiceStaleCache,
  type MobileMemberCooperativeServiceQaState,
} from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import type { MobileMemberGuarantorSnapshot } from "./member-guarantor-types"

export function presentMemberGuarantorApprovalsForQa(
  snapshot: MobileMemberGuarantorSnapshot,
  qaState: MobileMemberCooperativeServiceQaState | null
): MobileMemberGuarantorSnapshot {
  if (qaState === "empty") {
    return {
      ...snapshot,
      approvals: [],
      summary: {
        approvedApprovals: 0,
        pendingApprovals: 0,
        rejectedApprovals: 0,
        totalApprovals: 0,
      },
    }
  }

  if (qaState === "offline" || qaState === "stale") {
    return {
      ...snapshot,
      cache: createCooperativeServiceStaleCache({
        existing: snapshot.cache,
        generatedAt: snapshot.generatedAt,
        reason: qaState,
        scope: "ticket-29-guarantor-approvals-qa",
      }),
    }
  }

  return snapshot
}

export function getGuarantorResponseRestriction(
  qaState: MobileMemberCooperativeServiceQaState | null
) {
  if (qaState === "blocked") {
    return "Guarantor responses are paused for this member."
  }
  if (qaState === "disabled") {
    return "Guarantor responses are currently disabled by the cooperative."
  }
  if (qaState === "office-only") {
    return "Guarantor responses must be completed at the cooperative office."
  }
  if (qaState === "read-only") {
    return "Guarantor requests are currently available for viewing only."
  }
  return null
}
