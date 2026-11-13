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

export const memberSignupLinksPageCopy = {
  description: "Share a link so new members can join from their phone.",
  eyebrow: "Membership",
  title: "Member signup links",
} as const

export const signupAccessModeLabels: Record<SignupAccessMode, string> = {
  disabled: "No one. Joining online is off.",
  hidden: "Only people with a link",
  in_office: "Only people with a link",
  public: "Anyone can join",
}

/**
 * The three choices staff see. `hidden` behaves like `in_office` for
 * applicants (no direct joining, links work), so it is shown and saved as
 * "Only people with a link".
 */
export const signupAccessModeChoices = [
  {
    description: "People join with a link you share.",
    label: "Only people with a link",
    value: "in_office",
  },
  {
    description: "Anyone who opens your cooperative's page can join.",
    label: "Anyone",
    value: "public",
  },
  {
    description: "Joining online is off. Links stop working.",
    label: "No one",
    value: "disabled",
  },
] as const satisfies readonly {
  description: string
  label: string
  value: SignupAccessMode
}[]

export function toSignupAccessChoice(mode: SignupAccessMode) {
  return mode === "hidden" ? "in_office" : mode
}

export const signupLinkAvailabilityLabels: Record<
  SignupLinkAvailability,
  string
> = {
  available: "Working",
  blocked_by_gate: "Off: joining is closed",
  disabled: "Turned off",
  expired: "Ended",
  full: "Full",
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
