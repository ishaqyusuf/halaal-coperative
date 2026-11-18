import { describe, expect, test } from "bun:test"
import type { AdminAccess } from "@/features/admin-reports-access/public/admin-access-types"
import {
  buildWorkspaceAccessItems,
  formatAccessCount,
  formatAccessMemberships,
} from "./workspace-access-list"

const staff: AdminAccess["users"][number] = {
  id: "tenant-admin",
  fullName: "QA Admin",
  email: "admin@ishaq.qa.test",
  defaultRoleLabel: "Cooperative Admin",
  isPlatformOwner: false,
  memberships: [
    {
      id: "admin-role",
      role: "tenant_admin",
      label: "Cooperative Admin",
      isDefault: true,
    },
    { id: "member-role", role: "member", label: "Member", isDefault: false },
  ],
}
const member = {
  ...staff,
  id: "member",
  fullName: "Aisha Bello",
  defaultRoleLabel: null,
  memberships: staff.memberships.slice(1),
}

describe("workspace access directory", () => {
  test("groups a multi-role staff user once and keeps server totals while pages load", () => {
    const items = buildWorkspaceAccessItems({
      users: [member, staff],
      roles: [],
      staffCount: 3,
      workspaceCount: 17,
    })
    expect(items.map((item) => item.id)).toEqual([
      "staff-heading",
      "user:tenant-admin",
      "members-heading",
      "user:member",
    ])
    expect(items[0]).toMatchObject({ title: "Staff · 3" })
    expect(items[1]).toMatchObject({ first: true, last: true, user: staff })
    expect(items[2]).toMatchObject({ title: "Members · 14" })
  })
  test("leaves an empty list for the screen's empty state", () => {
    expect(buildWorkspaceAccessItems({ users: [], roles: [] })).toEqual([])
  })
  test("shows the default role once alongside all memberships", () => {
    expect(formatAccessMemberships(staff)).toBe(
      "Cooperative Admin (default) · Member"
    )
    expect(
      formatAccessMemberships({
        ...staff,
        memberships: [],
        defaultRoleLabel: null,
      })
    ).toBe("No role assigned")
    expect(formatAccessMemberships({ ...staff, memberships: [] })).toBe(
      "Cooperative Admin (default)"
    )
    expect(formatAccessMemberships(member)).toBe("Member")
  })
  test("uses singular and plural counts correctly", () => {
    expect(formatAccessCount(1, "user")).toBe("1 user")
    expect(formatAccessCount(0, "role")).toBe("0 roles")
    expect(formatAccessCount(5, "role")).toBe("5 roles")
  })
})
