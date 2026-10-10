import { describe, expect, test } from "bun:test"
import { createMobilePersistenceScope } from "./persistence-scope-key"

describe("mobile persistence scope", () => {
  test("isolates cache and draft keys by tenant, user, membership, and role", () => {
    const member = {
      activeMembershipId: "membership-member",
      cooperativeRole: "member",
      role: "member",
      tenant: { id: "tenant-1" },
      user: { id: "user-1" },
    }
    const admin = {
      activeMembershipId: "membership-admin",
      cooperativeRole: "tenant_admin",
      role: "admin",
      tenant: { id: "tenant-1" },
      user: { id: "user-1" },
    }
    const memberScope = createMobilePersistenceScope(member)
    const adminScope = createMobilePersistenceScope(admin)

    expect(memberScope.key).not.toBe(adminScope.key)
    expect(memberScope.key).toContain(member.tenant.id)
    expect(memberScope.key).toContain(member.user.id)
    expect(memberScope.key).toContain(member.activeMembershipId)
    expect(memberScope.key).toContain("member")
  })
})
