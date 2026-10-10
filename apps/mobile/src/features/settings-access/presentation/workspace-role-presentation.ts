import type { MobileProfile } from "@/lib/session-store"

export type WorkspaceRole = NonNullable<MobileProfile["availableRoles"]>[number]

export function formatWorkspaceRoleLabel(role: WorkspaceRole["role"] | string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function presentWorkspaceRole(input: {
  activeMembershipId: string
  role: WorkspaceRole
  switchingMembershipId: string | null
}) {
  const label = formatWorkspaceRoleLabel(input.role.role)
  const isActive = input.role.id === input.activeMembershipId
  const isSwitching = input.role.id === input.switchingMembershipId

  return {
    accessibilityLabel: isActive
      ? `${label} workspace, Current`
      : isSwitching
        ? `${label} workspace, Switching`
        : `Switch to ${label} workspace`,
    detail:
      input.role.workspaceRole === "admin"
        ? "Manage this cooperative"
        : "Your personal account",
    icon: input.role.workspaceRole === "admin" ? "ShieldCheck" : "User",
    isActive,
    isSwitching,
    label,
    stateLabel: isActive ? "Current" : isSwitching ? "Switching" : "Switch",
  } as const
}
