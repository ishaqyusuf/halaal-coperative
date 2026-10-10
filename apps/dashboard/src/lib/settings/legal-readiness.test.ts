import { describe, expect, it } from "bun:test"
import { buildLegalReadinessItems } from "./legal-readiness"

describe("legal readiness", () => {
  it("does not let one saved document satisfy the other documents", () => {
    const items = buildLegalReadinessItems({ legalTermsUrl: "https://example.org/terms", privacyPolicyUrl: null, dataProcessingUrl: null })
    expect(items.map((item) => item.status)).toEqual(["Reference saved; review required", "Document required", "Document required"])
    expect(items.every((item) => item.tone === "warning")).toBe(true)
  })
  it("does not count malformed or insecure references as evidence", () => {
    const items = buildLegalReadinessItems({ legalTermsUrl: "javascript:alert(1)", privacyPolicyUrl: "not a URL", dataProcessingUrl: "http://example.org/dpa" })
    expect(items.every((item) => item.status === "Document required")).toBe(true)
  })
})
