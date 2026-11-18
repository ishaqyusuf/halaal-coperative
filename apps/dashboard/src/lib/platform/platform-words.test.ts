import { describe, expect, test } from "bun:test"
import {
  formatTimeFromNow,
  getPrivacyNextStep,
  getPrivacyRequestWord,
  getQaRunWord,
  getRefundReviewWord,
} from "./platform-words"

const now = Date.parse("2026-11-14T12:00:00.000Z")

describe("platform words", () => {
  test("privacy requests read as one plain word and one next step", () => {
    expect(getPrivacyRequestWord({ status: "submitted" }).label).toBe("New")
    expect(getPrivacyRequestWord({ status: "verified" }).label).toBe(
      "Ready to end access"
    )
    expect(
      getPrivacyRequestWord({
        status: "verified",
        accessRevokedAt: "2026-11-10T00:00:00.000Z",
      }).label
    ).toBe("Access ended")
    expect(getPrivacyNextStep({ status: "awaiting_information" })).toBe(
      "Check it is really them."
    )
    expect(getPrivacyNextStep({ status: "processing" })).toContain("Write down")
    // A finished request also has an end-of-access date; it still reads Done.
    expect(
      getPrivacyRequestWord({
        status: "completed",
        accessRevokedAt: "2026-11-10T00:00:00.000Z",
      }).label
    ).toBe("Done")
    expect(getPrivacyNextStep({ status: "completed" })).toBeNull()
  })

  test("refund reviews are urgent when late, due soon or missing a deadline", () => {
    expect(getRefundReviewWord("2026-11-14T11:00:00.000Z", now).label).toBe(
      "Late"
    )
    expect(getRefundReviewWord("2026-11-14T13:00:00.000Z", now).label).toBe(
      "Due soon"
    )
    expect(getRefundReviewWord("2026-11-16T13:00:00.000Z", now).label).toBe(
      "Waiting"
    )
    expect(getRefundReviewWord(null, now)).toEqual({
      label: "No deadline",
      tone: "danger",
    })
  })

  test("time from now is short and plain", () => {
    expect(formatTimeFromNow("2026-11-14T15:00:00.000Z", now)).toBe(
      "in 3 hours"
    )
    expect(formatTimeFromNow("2026-11-12T12:00:00.000Z", now)).toBe(
      "2 days ago"
    )
    expect(formatTimeFromNow(null, now)).toBeNull()
  })

  test("test-data removal runs have plain words", () => {
    expect(getQaRunWord("running").label).toBe("Removing")
    expect(getQaRunWord("partially_completed").label).toBe("Partly done")
  })
})
