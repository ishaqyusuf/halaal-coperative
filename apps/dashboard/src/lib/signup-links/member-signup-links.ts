export type SignupAccessMode = "disabled" | "hidden" | "in_office" | "public"

export type SignupLinkAvailability =
  | "available"
  | "blocked_by_gate"
  | "disabled"
  | "expired"
  | "full"

export type MemberSignupLinkView = {
  analytics: {
    approvedCount: number
    pendingApprovalCount: number
    rejectedCount: number
    remainingSlots: number | null
    totalRequests: number
    verifiedCount: number
  }
  availability: SignupLinkAvailability
  createdAt: string
  expiresAt: string | null
  id: string
  isEnabled: boolean
  lastUsedAt: string | null
  maxSignups: number | null
  name: string
  notes: string | null
  signupUrl: string
}

export const signupAccessModeLabels: Record<SignupAccessMode, string> = {
  disabled: "Disabled",
  hidden: "Hidden, links only",
  in_office: "In-office only",
  public: "Public signup",
}

export const signupLinkAvailabilityLabels: Record<
  SignupLinkAvailability,
  string
> = {
  available: "Available",
  blocked_by_gate: "Blocked by signup gate",
  disabled: "Disabled",
  expired: "Expired",
  full: "Capacity reached",
}

export function getSignupLinkAvailability(input: {
  expiresAt: Date | null
  isEnabled: boolean
  remainingSlots: number | null
  signupAccessMode: SignupAccessMode
  now?: Date
}): SignupLinkAvailability {
  if (!input.isEnabled) {
    return "disabled"
  }

  if (input.signupAccessMode === "disabled") {
    return "blocked_by_gate"
  }

  if (
    input.expiresAt &&
    input.expiresAt.getTime() <= (input.now ?? new Date()).getTime()
  ) {
    return "expired"
  }

  if (input.remainingSlots === 0) {
    return "full"
  }

  return "available"
}
