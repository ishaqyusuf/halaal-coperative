import { describe, expect, test } from "bun:test"
import { resolveScreenStatusBar } from "./screen-status-bar-policy"

describe("focused screen status bar", () => {
  test("inactive screens relinquish the bar", () => {
    for (const tone of ["background", "brand", "hero", "surface"] as const) {
      expect(
        resolveScreenStatusBar({ colorScheme: "light", focused: false, tone })
      ).toBeNull()
    }
  })

  test("canvas and scrolled-surface screens follow their theme", () => {
    for (const tone of ["background", "surface"] as const) {
      expect(
        resolveScreenStatusBar({ colorScheme: "light", focused: true, tone })
      ).toEqual({ style: "dark" })
      expect(
        resolveScreenStatusBar({ colorScheme: "dark", focused: true, tone })
      ).toEqual({ style: "light" })
    }
  })

  test("brand headers and heroes keep light icons in either theme", () => {
    for (const tone of ["brand", "hero"] as const) {
      for (const colorScheme of ["light", "dark"] as const) {
        expect(
          resolveScreenStatusBar({ colorScheme, focused: true, tone })
        ).toEqual({ style: "light" })
      }
    }
  })

  test("never paints a bar colour (edge-to-edge; the app draws under it)", () => {
    for (const tone of ["background", "brand", "hero", "surface"] as const) {
      const appearance = resolveScreenStatusBar({
        colorScheme: "light",
        focused: true,
        tone,
      })
      expect(appearance && "backgroundColor" in appearance).toBe(false)
    }
  })
})
