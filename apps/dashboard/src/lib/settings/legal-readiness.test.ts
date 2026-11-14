import { describe, expect, it } from "bun:test"
import { buildLegalReadinessItems } from "./legal-readiness"

describe("legal readiness", () => {
  it("does not let one saved document satisfy the other documents", () => {
    const items = buildLegalReadinessItems({
      dataProcessingUrl: null,
      legalTermsUrl: "https://example.org/terms",
      privacyPolicyUrl: null,
    })
    expect(items.map((item) => item.done)).toEqual([true, false, false])
    expect(items[0]?.detail).toBe("Link on example.org")
  })

  it("does not count malformed or insecure links", () => {
    const items = buildLegalReadinessItems({
      dataProcessingUrl: "http://example.org/dpa",
      legalTermsUrl: "javascript:alert(1)",
      privacyPolicyUrl: "not a URL",
    })
    expect(items.every((item) => !item.done)).toBe(true)
    expect(items[2]?.detail).toContain("https://")
  })
})
