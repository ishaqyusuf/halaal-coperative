import type { MobileAdminMembers } from "./admin-member-lifecycle-types"

type MemberExpansion = NonNullable<MobileAdminMembers["memberExpansion"]>

export type MemberExpansionPresentation = {
  detail: string
  title: string
} | null

const UNAVAILABLE = "New members can’t be added right now."

/**
 * Server-owned member capacity, shown without plan names or upgrade prompts
 * (owner rule, ADR-20261116-mobile-no-subscription-copy).
 */
export function getMemberExpansionPresentation(
  expansion: MemberExpansion | null | undefined
): MemberExpansionPresentation {
  if (!expansion) {
    return { detail: UNAVAILABLE, title: "Member creation unavailable" }
  }
  if (expansion.status === "available") return null

  if (expansion.status === "at_capacity") {
    return {
      detail:
        expansion.activeMemberLimit === null
          ? `${expansion.activeMemberCount} active members`
          : `${expansion.activeMemberCount} of ${expansion.activeMemberLimit} active members`,
      title: "Member capacity reached",
    }
  }

  return { detail: UNAVAILABLE, title: "Member creation unavailable" }
}
