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
