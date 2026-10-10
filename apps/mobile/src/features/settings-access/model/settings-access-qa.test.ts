import { describe, expect, test } from "bun:test"
import type { AdminAccess } from "@/features/admin-reports-access/public/admin-access-types"
import { presentAdminAccessForQa } from "./settings-access-qa"

const access = {
  generatedAt: "2026-08-31T10:00:00.000Z",
  roles: [{ role: "tenant_admin" }],
  summary: {
    defaultRoles: 1,
    memberUsers: 4,
    roleAssignments: 5,
    staffUsers: 1,
    workspaceUsers: 5,
  },
  users: [{ id: "user-1" }],
} as AdminAccess

describe("presentAdminAccessForQa", () => {
  test("empties workspace users but preserves the role catalogue", () => {
    const result = presentAdminAccessForQa(access, "empty")

    expect(result.users).toEqual([])
    expect(result.roles).toHaveLength(1)
    expect(result.summary.workspaceUsers).toBe(0)
  })

  test("marks offline access data stale", () => {
    const offline = presentAdminAccessForQa(access, "offline")

    expect(offline.cache?.status).toBe("stale")
    expect(offline.cache?.reason).toBe("offline")
    expect(presentAdminAccessForQa(access, "stale").cache?.reason).toBe(
      "stale"
    )
  })
})
