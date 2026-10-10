import type {
  MobileSubscriptionPlanCode,
  MobileSubscriptionSnapshot,
} from "@/lib/mobile-subscription-api"

export function canRoleManageSubscription(role: string | null | undefined) {
  return role === "super_admin" || role === "tenant_admin"
}

export function isSubscriptionReadOnly(input: {
  cacheStatus?: string
  isOnline: boolean
}) {
  return !input.isOnline || input.cacheStatus === "stale"
}

export function isStorePurchaseBindingCurrent(
  accountBinding: string | null,
  reviewedSubscriptionId: string | null
) {
  return Boolean(
    accountBinding &&
    reviewedSubscriptionId &&
    accountBinding === reviewedSubscriptionId
  )
}

export function canStartNativeStorePurchase(input: {
  hasSnapshot: boolean
  hasSubscription: boolean
  billingInfrastructureAvailable: boolean
  planAvailable: boolean
  isLoading: boolean
  error: string | null
  isOnline: boolean
  isStale: boolean
  storeReady: boolean
  storeBusy: boolean
  purchaseNeedsReview: boolean
  isCurrentPlan: boolean
}) {
  return (
    input.hasSnapshot &&
    input.hasSubscription &&
    input.billingInfrastructureAvailable &&
    input.planAvailable &&
    !input.isLoading &&
    !input.error &&
    input.isOnline &&
    !input.isStale &&
    input.storeReady &&
    !input.storeBusy &&
    !input.purchaseNeedsReview &&
    !input.isCurrentPlan
  )
}

export type MobileSubscriptionExceptionKind =
  | "denied"
  | "load_error"
  | "offline"
  | "stale"

export type MobileSubscriptionExceptionPresentation = {
  actionLabel: string
  description: string
  eyebrow: string
  kind: MobileSubscriptionExceptionKind
  title: string
  tone: "destructive" | "neutral" | "warning"
}

export function getSubscriptionExceptionPresentation(input: {
  canManage: boolean
  error: string | null
  hasSnapshot: boolean
  isOnline: boolean
  isStale: boolean
}): MobileSubscriptionExceptionPresentation | null {
  if (!input.canManage) {
    return {
      actionLabel: "Go back",
      description:
        "Subscription prices, invoices, and plan changes are limited to authorized cooperative admins.",
      eyebrow: "Restricted",
      kind: "denied",
      title: "Cooperative Admin access required",
      tone: "neutral",
    }
  }

  if (!input.isOnline) {
    return {
      actionLabel: "Check connection",
      description: input.hasSnapshot
        ? "Showing the last verified plan. Plan changes stay unavailable until the connection returns."
        : "Connect to load this cooperative's current plan and invoice details.",
      eyebrow: "Read-only",
      kind: "offline",
      title: "You're offline",
      tone: "warning",
    }
  }

  if (input.error) {
    return {
      actionLabel: "Try again",
      description: input.hasSnapshot
        ? "The last verified plan remains visible. Try again before recording a plan change."
        : "No billing details were changed. Try again to load the cooperative's current subscription.",
      eyebrow: "Not available",
      kind: "load_error",
      title: "Plan details couldn't load",
      tone: "destructive",
    }
  }

  if (input.isStale) {
    return {
      actionLabel: "Refresh details",
      description:
        "Showing the last verified plan. Refresh current billing details before recording a plan change.",
      eyebrow: "Refresh required",
      kind: "stale",
      title: "Plan data needs a refresh",
      tone: "warning",
    }
  }

  return null
}

export function getSubscriptionStatusPresentation(status: string) {
  switch (status) {
    case "free_beta":
      return { label: "Free beta", tone: "warning" as const }
    case "trialing":
      return { label: "Trial", tone: "warning" as const }
    case "active":
    case "enterprise":
    case "manual":
      return {
        label: status === "active" ? "Active" : "Managed",
        tone: "success" as const,
      }
    case "paid":
      return { label: "Paid", tone: "success" as const }
    case "open":
      return { label: "Open", tone: "warning" as const }
    case "past_due":
    case "grace":
      return {
        label: status === "grace" ? "Grace period" : "Past due",
        tone: "warning" as const,
      }
    case "suspended":
    case "cancelled":
      return {
        label: status === "suspended" ? "Suspended" : "Cancelled",
        tone: "destructive" as const,
      }
    default:
      return { label: status.replace(/_/g, " "), tone: "muted" as const }
  }
}

export function getSubscriptionWarning(snapshot: MobileSubscriptionSnapshot) {
  if (snapshot.status === "suspended") {
    return "Subscription access is suspended. Contact billing support before activating members."
  }
  if (snapshot.status === "past_due" || snapshot.status === "grace") {
    return "Billing needs attention. Existing access remains available only through the stated grace period."
  }
  if (snapshot.usage.isOverCapacity) {
    return "Active-member usage is above the plan limit. Existing records remain available, but new activations are blocked."
  }
  if (snapshot.usage.isAtCapacity) {
    return "This cooperative is at its active-member limit. Choose a larger plan before activating another member."
  }
  if ((snapshot.usage.usagePercent ?? 0) >= 80) {
    return "Active-member usage has reached 80% of the included plan capacity."
  }
  return null
}

export function getPlanActionLabel(input: {
  currentPlanCode: MobileSubscriptionPlanCode
  isOnline: boolean
  planCode: MobileSubscriptionPlanCode
}) {
  if (input.planCode === input.currentPlanCode) return "Current plan"
  if (!input.isOnline) return "Online required"
  if (input.planCode === "enterprise") return "Contact billing"
  return "Request plan change"
}
