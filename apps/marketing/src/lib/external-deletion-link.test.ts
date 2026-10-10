import { describe, expect, it } from "bun:test"
import {
  externalDeletionVerificationUrl,
  trustedExternalDeletionOrigin,
} from "./external-deletion-link"

describe("external deletion verification link", () => {
  it("keeps the secret out of the server-visible URL", () => {
    const token = "a".repeat(43)
    const link = new URL(
      externalDeletionVerificationUrl(
        "https://halaalvest.example",
        "challenge-123",
        token
      )
    )
    expect(link.searchParams.get("challenge")).toBe("challenge-123")
    expect(link.searchParams.has("token")).toBe(false)
    expect(link.pathname + link.search).not.toContain(token)
    expect(new URLSearchParams(link.hash.slice(1)).get("token")).toBe(token)
  })

  it("requires a configured public HTTPS origin for production email links", () => {
    expect(
      trustedExternalDeletionOrigin({ platformRootDomain: "halaalvest.com" })
    ).toBe("https://halaalvest.com")
    expect(
      trustedExternalDeletionOrigin({
        marketingAppUrl: "https://privacy.halaalvest.com",
      })
    ).toBe("https://privacy.halaalvest.com")
    for (const value of [
      undefined,
      "http://halaalvest.com",
      "https://halaalvest.localhost",
      "https://127.0.0.1",
      "https://attacker.test",
      "https://api.validation.invalid",
      "https://preview.example",
      "https://example.com",
      "https://staging.example.net",
      "https://attacker.test/path",
      "https://user:pass@halaalvest.com",
    ]) {
      expect(() =>
        trustedExternalDeletionOrigin({ marketingAppUrl: value })
      ).toThrow()
    }
  })

  it("does not let Preview email a Production verification link", () => {
    for (const hostname of [
      "halaalvest.com",
      "www.halaalvest.com",
      "app.halaalvest.com",
      "api.halaalvest.com",
    ]) {
      expect(() =>
        trustedExternalDeletionOrigin({
          appEnv: "preview",
          marketingAppUrl: `https://${hostname}`,
        })
      ).toThrow("isolated marketing origin")
    }
    expect(
      trustedExternalDeletionOrigin({
        appEnv: "preview",
        marketingAppUrl: "https://preview.halaalvest.com",
      })
    ).toBe("https://preview.halaalvest.com")
    expect(
      trustedExternalDeletionOrigin({
        appEnv: "production",
        marketingAppUrl: "https://halaalvest.com",
      })
    ).toBe("https://halaalvest.com")
    expect(() =>
      trustedExternalDeletionOrigin({
        marketingAppUrl: "https://halaalvest.com",
        vercelEnv: "preview",
      })
    ).toThrow("isolated marketing origin")
    expect(() =>
      trustedExternalDeletionOrigin({
        appEnv: "production",
        marketingAppUrl: "https://preview.halaalvest.com",
        vercelEnv: "preview",
      })
    ).toThrow("does not match")
  })
})
