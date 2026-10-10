import { describe, expect, test } from "bun:test"
import { selectActiveMembership, type MembershipRecord } from "./auth"

const memberships = [
  {
    id: "secondary-member",
    isDefault: false,
    role: "member",
    tenantId: "tenant-a",
    userId: "user-a",
  },
  {
    id: "default-admin",
    isDefault: true,
    role: "tenant_admin",
    tenantId: "tenant-a",
    userId: "user-a",
  },
  {
    id: "other-tenant",
    isDefault: true,
    role: "member",
    tenantId: "tenant-b",
    userId: "user-a",
  },
] satisfies MembershipRecord[]

describe("active membership selection", () => {
  test("prefers the default role within the resolved tenant", () => {
    expect(selectActiveMembership(memberships, "tenant-a")?.id).toBe(
      "default-admin"
    )
  })

  test("never falls through to a default role from another tenant", () => {
    expect(selectActiveMembership(memberships, "tenant-missing")).toBeNull()
  })

  test("uses the first role only when no default exists", () => {
    expect(
      selectActiveMembership(
        memberships.map((membership) => ({
          ...membership,
          isDefault: false,
        })),
        "tenant-a"
      )?.id
    ).toBe("secondary-member")
  })
})
