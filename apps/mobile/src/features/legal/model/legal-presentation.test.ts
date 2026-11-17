import { describe, expect, test } from "bun:test"
import type { LegalBundle, LegalDocument, LegalRecord } from "../api/legal-api"
import { LEGAL_STATUS, legalState, needsReviewTitle, recordTitle } from "./legal-presentation"

function doc(type: "terms" | "privacy", version = "2026-11"): LegalDocument {
  return {
    action: type === "terms" ? "accept_terms" : "acknowledge_notice",
    contentHash: `${type}-${version}`,
    contentSnapshot: { effectiveAt: "2026-11-01T00:00:00Z", introduction: "", sections: [], title: type },
    documentType: type,
    documentVersion: version,
    url: "",
  }
}
function record(type: "terms" | "privacy", version: string): LegalRecord {
  return {
    acceptedAt: new Date("2026-06-03T10:14:00Z"),
    action: type === "terms" ? "accept_terms" : "acknowledge_notice",
    contentHash: `${type}-${version}`,
    documentType: type,
    documentVersion: version,
  }
}
const bundle: LegalBundle = { acceptanceRequired: true, available: true, documents: [doc("terms"), doc("privacy")] }

describe("legal presentation", () => {
  test("first-time, updated and current states", () => {
    expect(legalState(bundle, [])).toBe("needs")
    expect(legalState(bundle, [record("terms", "2026-06"), record("privacy", "2026-06")])).toBe("updated")
    expect(legalState(bundle, [record("terms", "2026-11")])).toBe("updated")
    expect(legalState(bundle, [record("terms", "2026-11"), record("privacy", "2026-11")])).toBe("current")
  })

  test("drafts and unavailable bundles", () => {
    expect(legalState({ acceptanceRequired: false, available: false, documents: [] }, [])).toBe("drafts")
    expect(legalState({ acceptanceRequired: true, available: false, documents: [] }, [])).toBe("unavailable")
  })

  test("copy", () => {
    expect(needsReviewTitle(bundle, "needs")).toBe("Two documents need your review")
    expect(LEGAL_STATUS.updated.body(bundle)).toBe(
      "New versions took effect on 1 Nov 2026. Read them, then record your acknowledgement."
    )
    expect(recordTitle(record("terms", "2026-11"))).toBe("Accepted platform terms")
    expect(recordTitle(record("privacy", "2026-11"))).toBe("Acknowledged privacy notice")
  })
})
