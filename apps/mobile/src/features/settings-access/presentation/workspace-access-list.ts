import type { AdminAccess } from "@/features/admin-reports-access/public/admin-access-types"

type AccessUser = AdminAccess["users"][number]
type AccessRole = AdminAccess["roles"][number]

export type WorkspaceAccessItem =
  | { id: string; type: "heading"; title: string }
  | {
      id: string
      type: "user"
      user: AccessUser
      first: boolean
      last: boolean
    }
  | {
      id: string
      type: "role"
      role: AccessRole
      first: boolean
      last: boolean
    }

export function formatAccessCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`
}

export function isStaffAccessUser(user: AccessUser) {
  return user.memberships.some((membership) => membership.role !== "member")
}

export function formatAccessMemberships(user: AccessUser) {
  if (!user.memberships.length) {
    return user.defaultRoleLabel
      ? `${user.defaultRoleLabel} (default)`
      : "No role assigned"
  }
  return user.memberships
    .map(
      (membership) =>
        `${membership.label}${membership.isDefault ? " (default)" : ""}`
    )
    .join(" · ")
}

export function buildWorkspaceAccessItems({
  roles,
  staffCount,
  users,
  workspaceCount,
}: {
  roles: readonly AccessRole[]
  staffCount?: number
  users: readonly AccessUser[]
  workspaceCount?: number
}): WorkspaceAccessItem[] {
  const staff: AccessUser[] = []
  const members: AccessUser[] = []
  for (const user of users)
    (isStaffAccessUser(user) ? staff : members).push(user)

  const items: WorkspaceAccessItem[] = []
  const groups = [
    { key: "staff", title: "Staff", users: staff, count: staffCount },
    {
      key: "members",
      title: "Members",
      users: members,
      count:
        workspaceCount !== undefined && staffCount !== undefined
          ? workspaceCount - staffCount
          : undefined,
    },
  ]
  for (const group of groups) {
    if (!group.users.length) continue
    items.push({
      id: `${group.key}-heading`,
      type: "heading",
      title: `${group.title} · ${group.count ?? group.users.length}`,
    })
    group.users.forEach((user, index) =>
      items.push({
        id: `user:${user.id}`,
        type: "user",
        user,
        first: index === 0,
        last: index === group.users.length - 1,
      })
    )
  }

  const visibleRoles = roles.filter(
    (role) => role.role !== "super_admin" || role.usersCount > 0
  )
  if (visibleRoles.length) {
    items.push({ id: "roles-heading", type: "heading", title: "Roles" })
    visibleRoles.forEach((role, index) =>
      items.push({
        id: `role:${role.role}`,
        type: "role",
        role,
        first: index === 0,
        last: index === visibleRoles.length - 1,
      })
    )
  }
  return items
}
