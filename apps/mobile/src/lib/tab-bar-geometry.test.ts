import { describe, expect, it } from "bun:test"
import { resolveTabBarGeometry } from "./tab-bar-geometry"

describe("tab bar safe-area geometry", () => {
  for (const inset of [0, 8, 24, 34, 48]) {
    it(`preserves 56dp targets above the ${inset}dp system area`, () => {
      const geometry = resolveTabBarGeometry(inset)
      expect(geometry.paddingBottom).toBeGreaterThanOrEqual(inset + 4)
      expect(
        geometry.height - geometry.paddingTop - geometry.paddingBottom
      ).toBe(56)
    })
  }

  it("normalizes unavailable and invalid insets", () => {
    expect(resolveTabBarGeometry(Number.NaN)).toEqual(resolveTabBarGeometry(0))
    expect(resolveTabBarGeometry(-4)).toEqual(resolveTabBarGeometry(0))
  })
})

describe("floating dock geometry", () => {
  it("floats 24pt above the bottom on a 34pt home-indicator phone", async () => {
    const { resolveDockGeometry } = await import("./tab-bar-geometry")
    const dock = resolveDockGeometry(34)
    expect(dock.bottom).toBe(24)
    expect(dock.height).toBe(64)
    expect(dock.contentInset).toBeGreaterThan(dock.bottom + dock.height)
    expect(dock.fabBottom).toBeGreaterThan(dock.bottom + dock.height)
  })

  it("keeps a 12pt floor on phones without an inset", async () => {
    const { resolveDockGeometry } = await import("./tab-bar-geometry")
    expect(resolveDockGeometry(0).bottom).toBe(12)
    expect(resolveDockGeometry(Number.NaN).bottom).toBe(12)
  })
})
