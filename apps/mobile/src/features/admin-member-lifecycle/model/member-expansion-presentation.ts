import type { MobileAdminMembers } from "./admin-member-lifecycle-types"

type MemberExpansion = NonNullable<MobileAdminMembers["memberExpansion"]>

export type MemberExpansionPresentation = {
  actionLabel: string
  detail: string
  title: string
} | null

export function getMemberExpansionPresentation(
  expansion: MemberExpansion | null | undefined
): MemberExpansionPresentation {
  if (!expansion) {
    return {
      actionLabel: "View plan",
      detail: "Plan status unavailable",
      title: "Member creation unavailable",
    }
  }
  if (expansion.status === "available") return null

  if (expansion.status === "at_capacity") {
    const plan = expansion.planName ?? "Current plan"
    const usage =
      expansion.activeMemberLimit === null
        ? `${expansion.activeMemberCount} active`
        : `${expansion.activeMemberCount} of ${expansion.activeMemberLimit} active`
    return {
      actionLabel: "View plan",
      detail: `${plan} · ${usage}`,
      title: "Member capacity reached",
    }
  }

  return {
    actionLabel: "View plan",
    detail: expansion.planName ?? "Plan status unavailable",
    title: "Member creation unavailable",
  }
}
