import { describe, expect, test } from "bun:test"
import { canAccessMarketingPreview } from "./marketing-preview-access"

describe("marketing preview access", () => {
  test("allows preview access outside production", () => {
    expect(
      canAccessMarketingPreview({
        configuredToken: undefined,
        isProduction: false,
        providedToken: undefined,
      })
    ).toBe(true)
  })

  test("requires a matching configured token in production", () => {
    expect(
      canAccessMarketingPreview({
        configuredToken: "private-preview",
        isProduction: true,
        providedToken: "private-preview",
      })
    ).toBe(true)

    expect(
      canAccessMarketingPreview({
        configuredToken: "private-preview",
        isProduction: true,
        providedToken: "wrong-preview",
      })
    ).toBe(false)
  })

  test("fails closed when production preview access is not configured", () => {
    expect(
      canAccessMarketingPreview({
        configuredToken: undefined,
        isProduction: true,
        providedToken: undefined,
      })
    ).toBe(false)
  })
})
