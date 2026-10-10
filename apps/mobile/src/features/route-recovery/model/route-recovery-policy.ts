import type { MobileRole } from "@/lib/session-store"

export type RouteRecoveryContent = {
  actionLabel: string
  description: string
  reassurance: string
}

export function getRouteRecoveryContent(
  role: MobileRole | null
): RouteRecoveryContent {
  if (role === "admin") {
    return {
      actionLabel: "Return to admin overview",
      description:
        "The link may be old, incomplete, or unavailable in your current cooperative workspace.",
      reassurance: "Your signed-in account and records are unchanged.",
    }
  }

  if (role === "member") {
    return {
      actionLabel: "Return to member home",
      description:
        "The link may be old, incomplete, or unavailable in your current cooperative workspace.",
      reassurance: "Your signed-in account and records are unchanged.",
    }
  }

  return {
    actionLabel: "Return to sign in",
    description: "The link may be old, incomplete, or no longer available.",
    reassurance: "No account changes were made.",
  }
}
