import { describe, expect, test } from "bun:test"

import type { MobileProfile } from "./session-store"
import { persistMobileSessionAtomically } from "./mobile-session-persistence"

const profile = {
  token: "mobile-session-token",
} as MobileProfile

describe("mobile session persistence", () => {
  test("persists the token before the matching profile", async () => {
    const operations: string[] = []

    await persistMobileSessionAtomically({
      clearSession: () => operations.push("clear"),
      persistProfile: () => operations.push("profile"),
      persistToken: () => operations.push("token"),
      profile,
    })

    expect(operations).toEqual(["token", "profile"])
  })

  test("clears a partially persisted session when profile storage fails", async () => {
    const operations: string[] = []
    const failure = new Error("profile storage failed")

    await expect(
      persistMobileSessionAtomically({
        clearSession: () => operations.push("clear"),
        persistProfile: () => {
          operations.push("profile")
          throw failure
        },
        persistToken: () => operations.push("token"),
        profile,
      })
    ).rejects.toBe(failure)

    expect(operations).toEqual(["token", "profile", "clear"])
  })

  test("preserves the original failure when rollback also fails", async () => {
    const failure = new Error("token storage failed")

    await expect(
      persistMobileSessionAtomically({
        clearSession: () => {
          throw new Error("rollback failed")
        },
        persistProfile: () => undefined,
        persistToken: () => {
          throw failure
        },
        profile,
      })
    ).rejects.toBe(failure)
  })
})
