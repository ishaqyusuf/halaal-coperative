import { describe, expect, test } from "bun:test"
import { resolveScreenStatusBar } from "./screen-status-bar-policy"

const colors = { background: "neutral-token", brandSurface: "brand-token" }

describe("focused screen status bar", () => {
  test("inactive screens relinquish both background and icon style", () => {
    for (const tone of ["background", "brand"] as const) {
      expect(
        resolveScreenStatusBar({
          ...colors,
          colorScheme: "light",
          focused: false,
          tone,
        })
      ).toBeNull()
    }
  })

  test("neutral screens follow their theme", () => {
    expect(
      resolveScreenStatusBar({
        ...colors,
        colorScheme: "light",
        focused: true,
        tone: "background",
      })
    ).toEqual({ backgroundColor: "neutral-token", style: "dark" })
    expect(
      resolveScreenStatusBar({
        ...colors,
        colorScheme: "dark",
        focused: true,
        tone: "background",
      })
    ).toEqual({ backgroundColor: "neutral-token", style: "light" })
  })

  test("brand headers retain inverse system icons in either theme", () => {
    for (const colorScheme of ["light", "dark"] as const) {
      expect(
        resolveScreenStatusBar({
          ...colors,
          androidApiLevel: 34,
          colorScheme,
          focused: true,
          tone: "brand",
        })
      ).toEqual({ backgroundColor: "brand-token", style: "light" })
    }
  })

  test("Android 15+ keeps icons legible on the effective theme-colored system bar", () => {
    expect(
      resolveScreenStatusBar({
        ...colors,
        androidApiLevel: 36,
        colorScheme: "light",
        focused: true,
        tone: "brand",
      })
    ).toEqual({ backgroundColor: "brand-token", style: "dark" })
    expect(
      resolveScreenStatusBar({
        ...colors,
        androidApiLevel: 36,
        colorScheme: "dark",
        focused: true,
        tone: "brand",
      })
    ).toEqual({ backgroundColor: "brand-token", style: "light" })
  })
})
