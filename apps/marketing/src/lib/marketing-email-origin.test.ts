import { describe, expect, test } from "bun:test"
import { getMarketingEmailOrigin } from "./marketing-email-origin"

describe("marketing email link origin", () => {
  test("never falls back to the request host in production", () => {
    for (const marketingAppUrl of [
      undefined,
      "http://halaalvest.com",
      "https://attacker.test",
    ]) {
      expect(() =>
        getMarketingEmailOrigin("https://attacker.example/api/signup", {
          marketingAppUrl,
          nodeEnv: "production",
        })
      ).toThrow(expect.objectContaining({ code: "PROVIDER_UNAVAILABLE" }))
    }
    expect(
      getMarketingEmailOrigin("https://attacker.example/api/signup", {
        marketingAppUrl: "https://halaalvest.com",
        nodeEnv: "production",
      })
    ).toBe("https://halaalvest.com")
  })

  test("requires an isolated Preview origin for signed email links", () => {
    expect(() =>
      getMarketingEmailOrigin("https://preview.halaalvest.com/api/signup", {
        appEnv: "preview",
        marketingAppUrl: "https://halaalvest.com",
        nodeEnv: "production",
      })
    ).toThrow(expect.objectContaining({ code: "PROVIDER_UNAVAILABLE" }))
    expect(
      getMarketingEmailOrigin("https://attacker.example/api/signup", {
        appEnv: "preview",
        marketingAppUrl: "https://preview.halaalvest.com",
        nodeEnv: "production",
      })
    ).toBe("https://preview.halaalvest.com")
    expect(() =>
      getMarketingEmailOrigin("https://preview.halaalvest.com/api/signup", {
        marketingAppUrl: "https://halaalvest.com",
        nodeEnv: "production",
        vercelEnv: "preview",
      })
    ).toThrow(expect.objectContaining({ code: "PROVIDER_UNAVAILABLE" }))
  })
})
