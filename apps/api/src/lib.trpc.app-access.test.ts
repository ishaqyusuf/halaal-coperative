import { describe, expect, test } from "bun:test"

import { readRequestAppAccess } from "./lib.trpc"

const actor = { membershipId: "m", tenantId: "t", userId: "u" }

function snapshot(accessAllowed: boolean) {
  return {
    accessAllowed,
    accessEndsAt: null,
    membershipId: "m",
    status: accessAllowed ? ("active" as const) : ("revoked" as const),
    tenantId: "t",
    userBinding: "u",
  }
}

describe("per-request app-access read", () => {
  test("procedures in one batched request share one read", async () => {
    let reads = 0
    const read = async () => {
      reads += 1
      return snapshot(true)
    }
    const request = {}
    const results = await Promise.all([
      readRequestAppAccess(request, actor, read),
      readRequestAppAccess(request, actor, read),
      readRequestAppAccess(request, actor, read),
    ])
    expect(reads).toBe(1)
    expect(results.every((result) => result.accessAllowed)).toBe(true)
  })

  test("every new request reads again, so turning access off applies at once", async () => {
    let allowed = true
    const read = async () => snapshot(allowed)
    expect((await readRequestAppAccess({}, actor, read)).accessAllowed).toBe(true)
    allowed = false
    expect((await readRequestAppAccess({}, actor, read)).accessAllowed).toBe(false)
  })

  test("a failed read is not reused within the request", async () => {
    let reads = 0
    const read = async () => {
      reads += 1
      if (reads === 1) throw new Error("database unavailable")
      return snapshot(true)
    }
    const request = {}
    await expect(readRequestAppAccess(request, actor, read)).rejects.toThrow()
    expect((await readRequestAppAccess(request, actor, read)).accessAllowed).toBe(true)
    expect(reads).toBe(2)
  })
})
