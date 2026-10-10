import { describe, expect, it } from "bun:test"
import { hasActiveUploadMembership } from "./upload-access"

const authorized = {
  tenant: { id: "tenant-a" },
  auth: { user: { id: "user-a" }, membership: { tenantId: "tenant-a", userId: "user-a" } },
}

describe("dashboard evidence access", () => {
  it("requires an active membership in the current tenant for the current user", () => {
    expect(hasActiveUploadMembership(authorized)).toBe(true)
    expect(hasActiveUploadMembership({ ...authorized, auth: { ...authorized.auth, membership: null } })).toBe(false)
    expect(hasActiveUploadMembership({ ...authorized, auth: { ...authorized.auth, membership: { tenantId: "tenant-b", userId: "user-a" } } })).toBe(false)
    expect(hasActiveUploadMembership({ ...authorized, auth: { ...authorized.auth, membership: { tenantId: "tenant-a", userId: "user-b" } } })).toBe(false)
  })
})
