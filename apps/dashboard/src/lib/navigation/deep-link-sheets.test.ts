import { describe, expect, test } from "bun:test"
import { matchDeepLinkSheetRoute } from "./deep-link-sheets"

describe("matchDeepLinkSheetRoute", () => {
  test("knows the routes whose sheets open from the URL", () => {
    expect(matchDeepLinkSheetRoute("/loans")).toBe("loan")
    expect(matchDeepLinkSheetRoute("/loans/")).toBe("loan")
    expect(matchDeepLinkSheetRoute("/members/abc-123")).toBe("memberDetail")
    expect(matchDeepLinkSheetRoute("/settings/finance")).toBe("tenantFinance")
    expect(matchDeepLinkSheetRoute("/settings/finance/loan")).toBe(
      "tenantFinance"
    )
  })

  test("ignores other routes, including member sub-pages", () => {
    expect(matchDeepLinkSheetRoute("/")).toBe(null)
    expect(matchDeepLinkSheetRoute("/members")).toBe(null)
    expect(matchDeepLinkSheetRoute("/members/abc/statement")).toBe(null)
    expect(matchDeepLinkSheetRoute("/settings/financed")).toBe(null)
    expect(matchDeepLinkSheetRoute(null)).toBe(null)
  })
})
