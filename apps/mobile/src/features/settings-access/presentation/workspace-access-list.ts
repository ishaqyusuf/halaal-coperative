import type { AdminAccess } from "@/features/admin-reports-access/public/admin-access-types"

export type WorkspaceAccessItem =
  | { id: "users-heading" | "roles-heading"; type: "heading"; title: string; count: string }
  | { id: string; type: "user"; user: AdminAccess["users"][number] }
  | { id: string; type: "role"; role: AdminAccess["roles"][number] }
  | { id: "users-empty" | "roles-empty"; type: "empty"; title: string }

export function formatAccessCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`
}

export function formatAccessMemberships(user: AdminAccess["users"][number]) {
  if (!user.memberships.length) {
    return user.defaultRoleLabel
      ? `${user.defaultRoleLabel} (default)`
      : "No role assigned"
  }
  const roles = user.memberships.map(
    membership => `${membership.label}${membership.isDefault ? " (default)" : ""}`
  )
  if (!user.memberships.some(membership => membership.isDefault)) {
    roles.push(user.defaultRoleLabel ? `${user.defaultRoleLabel} (default)` : "No default role")
  }
  return roles.join(" · ")
}

export function buildWorkspaceAccessItems(access: AdminAccess | null): WorkspaceAccessItem[] {
  if (!access) return []
  return [
    { id: "users-heading", type: "heading", title: "Users and roles", count: formatAccessCount(access.users.length, "user") },
    ...access.users.map(user => ({ id: `user:${user.id}`, type: "user" as const, user })),
    ...(access.users.length ? [] : [{ id: "users-empty", type: "empty", title: "No workspace users" } as const]),
    { id: "roles-heading", type: "heading", title: "Role coverage", count: formatAccessCount(access.roles.length, "role") },
    ...access.roles.map(role => ({ id: `role:${role.role}`, type: "role" as const, role })),
    ...(access.roles.length ? [] : [{ id: "roles-empty", type: "empty", title: "No workspace roles" } as const]),
  ]
}
