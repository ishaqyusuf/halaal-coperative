import { describe, expect, test } from "bun:test"
import { needsLegalReviewReminder } from "./legal-reminder"

const terms = {
  documentType: "terms",
  documentVersion: "2",
  contentHash: "approved-terms-hash",
}
const privacy = {
  documentType: "privacy",
  documentVersion: "2",
  contentHash: "approved-privacy-hash",
}
const published = { available: true, documents: [terms, privacy] }

describe("existing-account legal reminder", () => {
  test("shows for a missing or stale exact document record", () => {
    expect(needsLegalReviewReminder(published, [terms])).toBe(true)
    expect(
      needsLegalReviewReminder(published, [
        terms,
        { ...privacy, contentHash: "superseded-copy" },
      ])
    ).toBe(true)
  })

  test("clears only when both current versions and hashes are recorded", () => {
    expect(needsLegalReviewReminder(published, [privacy, terms])).toBe(false)
  })

  test("does not treat drafts or a failed history read as a reminder", () => {
    expect(
      needsLegalReviewReminder(
        { available: false, documents: [terms, privacy] },
        []
      )
    ).toBe(false)
    expect(needsLegalReviewReminder(published, null)).toBe(false)
  })
})
