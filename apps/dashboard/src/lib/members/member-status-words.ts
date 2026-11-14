/**
 * Plain words for a member's state on staff pages. The registry, the member
 * detail page and the statement use the same words so staff read one language.
 */

export type MemberRegistryStatus =
  | "active"
  | "exited"
  | "inactive"
  | "pending"
  | "suspended"

export type MemberReadinessInput = {
  issues: readonly string[]
  migration: { mode: "brought_forward" | "historical_backfill" }
} | null

export type MemberStateTone = "good" | "muted" | "warning" | "danger"

const memberStatusLabels: Record<MemberRegistryStatus, string> = {
  active: "Active",
  exited: "Left",
  inactive: "Inactive",
  pending: "Pending",
  suspended: "Suspended",
}

export function getMemberStatusLabel(status: string) {
  return memberStatusLabels[status as MemberRegistryStatus] ?? status
}

export function getMemberTypeLabel(memberType: string) {
  switch (memberType) {
    case "civil_servant":
      return "Civil servant"
    case "business":
      return "Business"
    default:
      return "Individual"
  }
}

export function getOpeningStepLabel(
  mode: "brought_forward" | "historical_backfill"
) {
  return mode === "brought_forward" ? "Opening balance" : "Past records"
}

/**
 * One word for the registry row: the member's status when they are not
 * active, otherwise the first thing still missing, otherwise "Ready".
 */
export function getMemberState(
  status: string,
  readiness: MemberReadinessInput
): { label: string; tone: MemberStateTone } {
  if (status === "suspended") return { label: "Suspended", tone: "danger" }
  if (status !== "active") {
    return {
      label: getMemberStatusLabel(status),
      tone: status === "pending" ? "warning" : "muted",
    }
  }

  if (readiness?.issues.includes("kyc_unverified")) {
    return { label: "Needs KYC", tone: "warning" }
  }

  if (readiness?.issues.includes("migration_incomplete")) {
    return {
      label: `Needs ${getOpeningStepLabel(readiness.migration.mode).toLowerCase()}`,
      tone: "warning",
    }
  }

  return { label: "Ready", tone: "good" }
}

export const memberStateToneClassNames: Record<MemberStateTone, string> = {
  danger: "border-red-200 bg-red-50 text-red-800",
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  muted: "border-border bg-muted text-muted-foreground",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
}

/** Copy for the status-change confirm (an AlertDialog). */
export function getMemberStatusChangeCopy(status: string | null) {
  switch (status) {
    case "active":
      return {
        action: "Make active",
        body: "They can save, borrow and make requests again.",
        title: "Make this member active?",
      }
    case "suspended":
      return {
        action: "Suspend",
        body: "They can't save, borrow or make requests until you make them active again.",
        title: "Suspend this member?",
      }
    case "inactive":
      return {
        action: "Mark inactive",
        body: "They can't save, borrow or make requests until you make them active again.",
        title: "Mark this member inactive?",
      }
    default:
      return {
        action: "Change status",
        body: "The new status is saved straight away.",
        title: "Change this member's status?",
      }
  }
}
