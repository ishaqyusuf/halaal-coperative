import { describe, expect, test } from "bun:test"
import { resolveDashboardPublicLegalOrigin } from "./public-legal-origin"

describe("dashboard public legal origin", () => {
  test("accepts a reviewed HTTPS marketing origin", () => {
    expect(
      resolveDashboardPublicLegalOrigin(
        "https://halaal-vest-marketing-preview.vercel.app/"
      )
    ).toBe("https://halaal-vest-marketing-preview.vercel.app")
  })

  test("leaves links unavailable without a safe configured origin", () => {
    for (const value of [
      undefined,
      "https://halaalvest.local",
      "http://halaalvest.com",
      "https://user:password@halaalvest.com",
      "https://halaalvest.com/terms",
      "https://halaalvest.com/?next=/privacy",
      "https://127.0.0.1",
      "https://preview.invalid",
    ]) {
      expect(resolveDashboardPublicLegalOrigin(value)).toBeNull()
    }
  })
})
