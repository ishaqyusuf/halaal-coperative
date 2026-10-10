import { describe, expect, test } from "bun:test"

import { loadAppLockState } from "./app-lock-hydration"

describe("mobile app lock hydration", () => {
  test("fails closed when secure storage rejects", async () => {
    const result = await loadAppLockState(async () => {
      throw new Error("secure storage unavailable")
    }, 50)

    expect(result).toEqual({
      config: null,
      reason: "storage_unavailable",
      status: "error",
    })
  })

  test("fails closed when secure storage stops responding", async () => {
    const result = await loadAppLockState(
      () => new Promise(() => undefined),
      10
    )

    expect(result).toEqual({
      config: null,
      reason: "timeout",
      status: "error",
    })
  })
})
