import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import type { AdminAccess } from "@/features/admin-reports-access/public/admin-access-types"
import { buildWorkspaceAccessItems, formatAccessCount, formatAccessMemberships } from "./workspace-access-list"

const user: AdminAccess["users"][number] = {
  id: "tenant-admin", fullName: "QA Admin", email: "admin@ishaq.qa.test", defaultRoleLabel: "Cooperative Admin", isPlatformOwner: false,
  memberships: [
    { id: "admin-role", role: "tenant_admin", label: "Cooperative Admin", isDefault: true },
    { id: "member-role", role: "member", label: "Member", isDefault: false },
  ],
}
const access: AdminAccess = {
  generatedAt: "2026-09-05T12:00:00Z",
  users: [user],
  roles: [{ role: "tenant_admin", label: "Cooperative Admin", scope: "Cooperative setup and operations.", usersCount: 1, defaultUsersCount: 1 }],
  summary: { workspaceUsers: 1, staffUsers: 1, memberUsers: 1, roleAssignments: 2, defaultRoles: 1 },
}

describe("workspace access continuous ledger", () => {
  test("keeps every user and role in a single stable typed sequence", () => {
    const items = buildWorkspaceAccessItems(access)
    expect(items.map(item => item.id)).toEqual(["users-heading", "user:tenant-admin", "roles-heading", "role:tenant_admin"])
    expect(items[1]).toEqual({ id: "user:tenant-admin", type: "user", user })
    expect(items[3]).toEqual({ id: "role:tenant_admin", type: "role", role: access.roles[0] })
    expect(new Set(items.map(item => item.id)).size).toBe(items.length)
  })
  test("does not truncate a large workspace to a fixed preview", () => {
    const items = buildWorkspaceAccessItems({ ...access, users: Array.from({ length: 500 }, (_, i) => ({ ...user, id: String(i) })) })
    expect(items.filter(item => item.type === "user")).toHaveLength(500)
    expect(items.at(-1)?.id).toBe("role:tenant_admin")
  })
  test("retains explicit empty and unavailable states", () => {
    expect(buildWorkspaceAccessItems(null)).toEqual([])
    expect(buildWorkspaceAccessItems({ ...access, users: [], roles: [] }).map(item => item.id)).toEqual(["users-heading", "users-empty", "roles-heading", "roles-empty"])
  })
  test("shows the default role once alongside all memberships", () => {
    expect(formatAccessMemberships(user)).toBe("Cooperative Admin (default) · Member")
    expect(formatAccessMemberships({ ...user, memberships: [], defaultRoleLabel: null })).toBe("No role assigned")
    expect(formatAccessMemberships({ ...user, memberships: [] })).toBe("Cooperative Admin (default)")
    expect(formatAccessMemberships({ ...user, defaultRoleLabel: null, memberships: [user.memberships[1]!] })).toBe("Member · No default role")
  })
  test("uses singular and plural counts correctly", () => {
    expect(formatAccessCount(1, "user")).toBe("1 user")
    expect(formatAccessCount(0, "role")).toBe("0 roles")
    expect(formatAccessCount(5, "role")).toBe("5 roles")
  })
  test("screen delegates rows to one root list, not fixed-height nested lists", () => {
    const screen = readFileSync(new URL("../screens/more-screen.tsx", import.meta.url), "utf8")
    const list = readFileSync(new URL("../components/more-content-list.tsx", import.meta.url), "utf8")
    expect(screen).not.toContain("VirtualizedCardList")
    expect(screen).not.toContain("<ScrollView")
    expect(list).toContain("ListHeaderComponent=")
    expect(list).toContain("ListFooterComponent=")
    expect(list).toContain("getItemType={getItemType}")
    expect(list).not.toContain("maxHeight")
    expect(screen).toContain("<FullScreenFormSheet")
  })
})
