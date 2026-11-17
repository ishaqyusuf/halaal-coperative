import type { GroupedTone } from "@/components/app/grouped-section"
import type { StatusTone } from "@/components/ui/status-pill"

import type { ShortcutAssociation } from "./shortcut-state"
import {
  formatMembershipRole,
  type CooperativeWorkspace,
  type ShortcutPresentation,
  type ShortcutSupport,
  type WorkspaceMembership,
} from "./shortcut-policy"

/** 03 Grouped settings row pill for the home-screen shortcut (T27). */
export function shortcutPill(input: {
  association: ShortcutAssociation | null
  support: ShortcutSupport
}): { label: string; tone: StatusTone } {
  switch (input.support) {
    case "checking":
      return { label: "Checking", tone: "neutral" }
    case "user_locked":
      return { label: "Locked", tone: "warning" }
    case "supported":
      break
    default:
      return { label: "Unavailable", tone: "neutral" }
  }
  switch (input.association?.status ?? "not_offered") {
    case "request_prepared":
    case "request_sent":
      return { label: "Waiting", tone: "warning" }
    case "pin_observed":
      return { label: "On home screen", tone: "success" }
    case "disabled":
      return { label: "Disabled", tone: "neutral" }
    default:
      return { label: "Not added", tone: "neutral" }
  }
}

export const SHORTCUT_ACTION_ROWS: Record<
  ShortcutPresentation["actions"][number],
  { busy: string; icon: string; label: string; tone: GroupedTone }
> = {
  add: { busy: "Requesting…", icon: "Plus", label: "Add to home screen", tone: "mint" },
  disable: { busy: "Disabling…", icon: "Ban", label: "Disable shortcut", tone: "danger" },
  refresh: { busy: "Refreshing…", icon: "RotateCw", label: "Refresh icon", tone: "sky" },
  retry: { busy: "Requesting…", icon: "RefreshCw", label: "Try again", tone: "amber" },
}

/** "Member · Cooperative Admin": every role the account holds there. */
export function rolesLine(workspace: Pick<CooperativeWorkspace, "memberships">) {
  return workspace.memberships.map((membership) => formatMembershipRole(membership.role)).join(" · ")
}

export function roleDescription(membership: Pick<WorkspaceMembership, "workspaceRole">) {
  return membership.workspaceRole === "member"
    ? "Your savings, financing and statements"
    : "Manage the cooperative"
}

/** The cooperative's initials for the 30pt mark tile (at most 3 letters). */
export function workspaceMark(workspace: Pick<CooperativeWorkspace, "tenant">) {
  return workspace.tenant.mark.slice(0, 3).toUpperCase()
}

/** Current cooperative first; the others in name order (already sorted). */
export function splitWorkspaces(
  workspaces: readonly CooperativeWorkspace[],
  activeMembershipId: string | null
) {
  const current = workspaces.find((workspace) => workspace.isCurrent) ?? null
  return {
    current,
    currentRole: current?.memberships.find((membership) => membership.id === activeMembershipId) ?? null,
    otherRoles: current?.memberships.filter((membership) => membership.id !== activeMembershipId) ?? [],
    others: workspaces.filter((workspace) => !workspace.isCurrent),
  }
}
