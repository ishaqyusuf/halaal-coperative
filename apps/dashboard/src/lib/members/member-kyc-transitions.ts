/**
 * KYC review moves one step at a time: a record must be under review
 * (`pending`) before it can be verified or rejected. The server enforces the
 * same map in `@halaalvest/db` (`getAllowedMemberKycTransitions`); a test keeps
 * the two in step, so the status picker only offers changes that will save.
 */
export type MemberKycStatus = "not_started" | "pending" | "verified" | "rejected"

const memberKycTransitions: Record<MemberKycStatus, readonly MemberKycStatus[]> =
  {
    not_started: ["pending"],
    pending: ["verified", "rejected"],
    rejected: ["pending"],
    verified: ["pending"],
  }

const memberKycStatusLabels: Record<MemberKycStatus, string> = {
  not_started: "Not started",
  pending: "Pending review",
  rejected: "Rejected",
  verified: "Verified",
}

export function getMemberKycNextStatuses(status: MemberKycStatus) {
  return memberKycTransitions[status]
}

/** The current status first, then only the statuses it may move to. */
export function getMemberKycStatusOptions(status: MemberKycStatus) {
  return [status, ...memberKycTransitions[status]].map((value) => ({
    label:
      value === status
        ? `${memberKycStatusLabels[value]} (current)`
        : memberKycStatusLabels[value],
    value,
  }))
}

/** Explains the next step when the jump staff expect is not one move away. */
export function getMemberKycStatusHint(status: MemberKycStatus) {
  switch (status) {
    case "not_started":
      return "Start with Pending review. Verify or reject once the documents are checked."
    case "rejected":
      return "Move back to Pending review when the member sends new documents."
    case "verified":
      return "Move back to Pending review to re-check this member's identity."
    case "pending":
      return "Verify or reject once the documents are checked."
  }
}
