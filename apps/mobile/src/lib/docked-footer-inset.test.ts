import { describe, expect, test } from "bun:test"
import { resolveDockedFooterInset } from "./docked-footer-inset"

describe("docked footer inset", () => {
  test("Android keeps a 16pt gap above the gesture handle", () => {
    expect(resolveDockedFooterInset(24, "android")).toBe(40)
    expect(resolveDockedFooterInset(48, "android")).toBe(64)
  })

  test("Android without a reported inset still clears the screen edge", () => {
    expect(resolveDockedFooterInset(0, "android")).toBe(24)
  })

  test("iOS sits on the home-indicator inset, at least 16pt", () => {
    expect(resolveDockedFooterInset(34, "ios")).toBe(34)
    expect(resolveDockedFooterInset(0, "ios")).toBe(16)
  })
})
