import { describe, expect, test } from "bun:test"
import { resolveOnlineState } from "./mobile-runtime-state"

describe("mobile runtime connectivity", () => {
  test("treats either disconnected signal as offline", () => {
    expect(resolveOnlineState(false, null)).toBe(false)
    expect(resolveOnlineState(true, false)).toBe(false)
  })

  test("waits while internet reachability is unknown", () => {
    expect(resolveOnlineState(true, null)).toBeNull()
  })

  test("requires both positive signals for online commands", () => {
    expect(resolveOnlineState(true, true)).toBe(true)
  })
})
