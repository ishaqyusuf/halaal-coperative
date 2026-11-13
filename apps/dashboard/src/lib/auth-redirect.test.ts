import { describe, expect, test } from "bun:test"
import { normalizeDashboardRedirectPath } from "./auth-redirect"

describe("normalizeDashboardRedirectPath", () => {
  test("keeps same-origin deep links with their query", () => {
    expect(normalizeDashboardRedirectPath("/loans?loanSheetType=request")).toBe(
      "/loans?loanSheetType=request"
    )
    expect(
      normalizeDashboardRedirectPath("/members/m1?memberDetailSheetType=kyc")
    ).toBe("/members/m1?memberDetailSheetType=kyc")
  })

  test("refuses anything that could leave the origin", () => {
    for (const value of [
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
    ]) {
      expect(normalizeDashboardRedirectPath(value)).toBe("/")
    }
  })

  test("never loops back to login or logout", () => {
    expect(normalizeDashboardRedirectPath("/login?next=/x")).toBe("/")
    expect(normalizeDashboardRedirectPath("/logout")).toBe("/")
  })
})
