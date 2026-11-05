import { describe, expect, test } from "bun:test"

import {
  buildShortcutUri,
  createShortcutId,
  parseShortcutId,
  shortcutRoutePath,
} from "./shortcut-intent"
import {
  buildShortcutLabels,
  sanitizeCooperativeName,
  sanitizeShortcutMark,
} from "./shortcut-label"

const fixedBytes = () =>
  Uint8Array.from({ length: 16 }, (_, index) => index * 15)

describe("cooperative shortcut intent", () => {
  test("creates opaque versioned ids from 128 random bits", () => {
    const id = createShortcutId(fixedBytes)
    expect(id).toBe("cs1-000f1e2d3c4b5a69788796a5b4c3d2e1")
    expect(parseShortcutId(id)).toBe(id)
    expect(() => createShortcutId(() => new Uint8Array(4))).toThrow()
  })

  test("rejects malformed, old-version and route-like identifiers", () => {
    for (const value of [
      undefined,
      ["cs1-000f1e2d3c4b5a69788796a5b4c3d2e1"],
      "cs0-000f1e2d3c4b5a69788796a5b4c3d2e1",
      "cs1-000F1E2D3C4B5A69788796A5B4C3D2E1",
      "cs1-000f1e2d3c4b5a69788796a5b4c3d2e1/../(admin)",
      "../(admin)/(tabs)",
      "cs1-",
    ]) {
      expect(parseShortcutId(value)).toBeNull()
    }
  })

  test("builds a variant-scoped URI that carries only the opaque id", () => {
    const id = createShortcutId(fixedBytes)
    expect(buildShortcutUri("halaalvest-preview", id)).toBe(
      `halaalvest-preview://cooperative-shortcut/${id}`
    )
    expect(shortcutRoutePath(id)).toBe(`/cooperative-shortcut/${id}`)
    expect(() => buildShortcutUri("https://evil.example", id)).toThrow()
    expect(() => buildShortcutUri("halaalvest", "token-abc")).toThrow()
  })
})

describe("cooperative shortcut labels", () => {
  test("strips control and bidi characters and bounds labels", () => {
    expect(sanitizeCooperativeName(" Amanah\u202e  Savings\n Coop ")).toBe(
      "Amanah Savings Coop"
    )
    expect(
      buildShortcutLabels("Amanah Savings and Credit Cooperative")
    ).toEqual({
      longLabel: "Amanah Savings and…",
      shortLabel: "Amanah…",
    })
    expect(buildShortcutLabels("Barakah")).toEqual({
      longLabel: "Barakah",
      shortLabel: "Barakah",
    })
    expect(buildShortcutLabels("\u200b")).toEqual({
      longLabel: "HalaalVest",
      shortLabel: "HalaalVest",
    })
  })

  test("keeps marks to a few safe alphanumerics", () => {
    expect(sanitizeShortcutMark("as")).toBe("AS")
    expect(sanitizeShortcutMark("<svg>")).toBe("SVG")
    expect(sanitizeShortcutMark("")).toBe("HV")
    expect(sanitizeShortcutMark(null)).toBe("HV")
  })
})
