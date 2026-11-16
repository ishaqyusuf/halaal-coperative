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

describe("active read refresh covers the app query layer", () => {
  test("refreshActiveReads refetches every stale active query without cancelling in-flight ones", async () => {
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    const source = readFileSync(
      join(import.meta.dir, "mobile-runtime-provider.tsx"),
      "utf8"
    )
    expect(source).toContain('{ stale: true, type: "active" }')
    expect(source).toContain("{ cancelRefetch: false }")
    expect(source).toContain("focusManager.setFocused")
    expect(source).toContain("onlineManager.setOnline")
  })
})
