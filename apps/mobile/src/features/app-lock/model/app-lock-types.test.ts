import { describe, expect, test } from "bun:test"

import {
  isValidAppLockCode,
  normalizeAppLockCode,
  shouldClearAppLockForIdentityChange,
  shouldRelockApp,
} from "./app-lock-types"

describe("mobile app lock policy", () => {
  test("normalizes the local PIN without changing its fixed length", () => {
    expect(normalizeAppLockCode("12a34 567")).toBe("123456")
    expect(isValidAppLockCode("123456")).toBe(true)
    expect(isValidAppLockCode("12345")).toBe(false)
  })

  test("relocks only after the configured bounded background interval", () => {
    expect(
      shouldRelockApp({ backgroundedAt: 1_000, now: 1_000, relockAfterMs: 0 })
    ).toBe(true)
    expect(
      shouldRelockApp({
        backgroundedAt: 1_000,
        now: 60_999,
        relockAfterMs: 60_000,
      })
    ).toBe(false)
    expect(
      shouldRelockApp({
        backgroundedAt: 1_000,
        now: 61_000,
        relockAfterMs: 60_000,
      })
    ).toBe(true)
  })

  test("clears local protection on sign-out, session revocation, or user change", () => {
    const current = { deviceId: "device-1", userId: "user-1" }

    expect(
      shouldClearAppLockForIdentityChange({
        nextIdentity: current,
        previousIdentity: current,
      })
    ).toBe(false)
    expect(
      shouldClearAppLockForIdentityChange({
        nextIdentity: null,
        previousIdentity: current,
      })
    ).toBe(true)
    expect(
      shouldClearAppLockForIdentityChange({
        nextIdentity: { deviceId: "device-1", userId: "user-2" },
        previousIdentity: current,
      })
    ).toBe(true)
  })
})
