import { describe, expect, test } from "bun:test"

import {
  clearInvalidatedMobileSessionState,
  registerMobileLocalSecurityClearer,
  shouldInvalidateUnauthorizedMobileSession,
} from "./mobile-session-invalidation"

describe("mobile session invalidation", () => {
  test("clears the session, form drafts, report files, and scoped read cache", async () => {
    const cleared = new Set<string>()

    const unregister = registerMobileLocalSecurityClearer(() => {
      cleared.add("local-security")
    })

    try {
      await clearInvalidatedMobileSessionState({
        clearDrafts: () => {
          cleared.add("drafts")
        },
        clearFiles: () => {
          cleared.add("files")
        },
        clearReads: () => {
          cleared.add("reads")
        },
        clearSession: () => {
          cleared.add("session")
        },
        clearDeviceId: () => {
          cleared.add("device-id")
        },
      })
    } finally {
      unregister()
    }

    expect(cleared).toEqual(
      new Set([
        "session",
        "drafts",
        "files",
        "reads",
        "local-security",
        "device-id",
      ])
    )
  })

  test("still revokes the session when report-cache removal fails", async () => {
    const cleared = new Set<string>()
    await expect(
      clearInvalidatedMobileSessionState({
        clearDrafts: async () => void cleared.add("drafts"),
        clearFiles: async () => {
          throw new Error("cache unavailable")
        },
        clearReads: async () => void cleared.add("reads"),
        clearSession: async () => void cleared.add("session"),
        clearDeviceId: async () => void cleared.add("device-id"),
      })
    ).rejects.toThrow("cache unavailable")
    expect(cleared).toEqual(
      new Set(["session", "drafts", "reads", "device-id"])
    )
  })

  test("invalidates only the token whose request received the unauthorized response", () => {
    expect(
      shouldInvalidateUnauthorizedMobileSession({
        currentToken: "session-a",
        requestToken: "session-a",
        responseStatus: 401,
      })
    ).toBe(true)
    expect(
      shouldInvalidateUnauthorizedMobileSession({
        currentToken: "session-b",
        requestToken: "session-a",
        responseStatus: 401,
      })
    ).toBe(false)
    expect(
      shouldInvalidateUnauthorizedMobileSession({
        currentToken: null,
        requestToken: "session-a",
        responseStatus: 401,
      })
    ).toBe(false)
  })

  test("does not invalidate a current session for successful responses", () => {
    expect(
      shouldInvalidateUnauthorizedMobileSession({
        currentToken: "session-a",
        requestToken: "session-a",
        responseStatus: 200,
      })
    ).toBe(false)
  })
})
