import { describe, expect, test } from "bun:test"
import { resolveActiveMarketingExperienceId } from "./marketing-experience-policy"

describe("marketing experience activation policy", () => {
  test("allows draft experiences outside production", () => {
    expect(
      resolveActiveMarketingExperienceId({
        isProduction: false,
        requestedExperienceId: "ramp-v2",
      })
    ).toBe("ramp-v2")
  })

  test("falls back when a draft experience is requested in production", () => {
    expect(
      resolveActiveMarketingExperienceId({
        isProduction: true,
        requestedExperienceId: "ramp-v2",
      })
    ).toBe("organic-trust-v1")
  })

  test("keeps a production-ready experience active", () => {
    expect(
      resolveActiveMarketingExperienceId({
        isProduction: true,
        requestedExperienceId: "organic-trust-v1",
      })
    ).toBe("organic-trust-v1")
  })
})
