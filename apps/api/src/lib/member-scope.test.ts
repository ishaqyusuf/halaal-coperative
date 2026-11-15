import { describe, expect, test } from "bun:test"
import { getScopedMemberId } from "./member-scope"

function memberContext(
  role: string,
  lookups?: {
    findMemberByUserId?: (input: {
      tenantId: string
      userId: string
    }) => Promise<{ id: string } | null>
  }
) {
  return {
    auth: {
      activeMembership: { role },
      session: { user: { id: "user-1" } },
    },
    lookups,
    tenant: { current: { id: "tenant-1" } },
  }
}

describe("getScopedMemberId", () => {
  test("staff get no member filter and no lookup", async () => {
    let calls = 0
    const scoped = await getScopedMemberId(
      memberContext("tenant_admin", {
        findMemberByUserId: async () => {
          calls += 1
          return { id: "member-1" }
        },
      })
    )

    expect(scoped).toBeUndefined()
    expect(calls).toBe(0)
  })

  test("a member is scoped through the request's shared member lookup", async () => {
    const inputs: unknown[] = []
    const scoped = await getScopedMemberId(
      memberContext("member", {
        findMemberByUserId: async (input) => {
          inputs.push(input)
          return { id: "member-1" }
        },
      })
    )

    expect(scoped).toBe("member-1")
    expect(inputs).toEqual([{ tenantId: "tenant-1", userId: "user-1" }])
  })

  test("a member without a profile matches nothing", async () => {
    const scoped = await getScopedMemberId(
      memberContext("member", { findMemberByUserId: async () => null })
    )

    expect(scoped).toBe("__missing_member_profile__")
  })
})
