import { describe, expect, test } from "bun:test"
import { accountDeletionNoticeCopy } from "@halaalvest/domain/account-privacy-notice"
import type { PrivacyRequest } from "../api/account-privacy-api"
import {
  canCancelPrivacyRequest,
  livePrivacyRequest,
  noticeItems,
  noticeVersionLabel,
  pastPrivacyRequests,
  pastRequestNote,
  privacyDueDay,
} from "./privacy-presentation"

function request(overrides: Partial<PrivacyRequest>): PrivacyRequest {
  return {
    accessRevokedAt: null,
    completedAt: null,
    completionSummary: null,
    id: "r",
    noticeVersion: "notice-sha256-abc",
    requestedAt: new Date("2026-11-17T09:00:00Z"),
    status: "submitted",
    supportCaseId: null,
    updatedAt: new Date("2026-11-17T09:00:00Z"),
    verifiedAt: null,
    ...overrides,
  }
}

describe("privacy presentation", () => {
  test("finds the live request and keeps past ones apart", () => {
    const list = [
      request({ id: "old", status: "cancelled", updatedAt: new Date("2026-06-11T09:00:00Z") }),
      request({ id: "live", status: "verified" }),
      request({ completionSummary: "Your cooperative administration handover was still open.", id: "no", status: "rejected" }),
    ]
    expect(livePrivacyRequest(list)?.id).toBe("live")
    expect(pastPrivacyRequests(list).map((item) => item.id)).toEqual(["old", "no"])
    expect(pastRequestNote(list[0]!)).toBe("Cancelled on 11 Jun 2026")
    expect(pastRequestNote(list[2]!)).toBe("Your cooperative administration handover was still open.")
    expect(livePrivacyRequest([list[0]!])).toBeNull()
  })

  test("allows cancel only before processing and access revocation", () => {
    expect(canCancelPrivacyRequest(request({ status: "submitted" }))).toBe(true)
    expect(canCancelPrivacyRequest(request({ status: "awaiting_information" }))).toBe(true)
    expect(canCancelPrivacyRequest(request({ status: "processing" }))).toBe(false)
    expect(
      canCancelPrivacyRequest(request({ accessRevokedAt: new Date(), status: "verified" }))
    ).toBe(false)
  })

  test("dates the response 30 days after the request", () => {
    expect(privacyDueDay(request({}))).toBe("17 Dec 2026")
  })

  test("heads every notice line and shortens the version", () => {
    const items = noticeItems(accountDeletionNoticeCopy)
    expect(items.map((item) => item.heading)).toEqual([
      "We verify it’s you first",
      "Money records are kept",
      "You can cancel before processing",
    ])
    expect(noticeItems({ consequences: ["Something new."] })[0]?.heading).toBe("Please review")
    expect(noticeVersionLabel(`notice-sha256-${"a1".repeat(32)}`)).toBe("a1a1a1a1")
    expect(noticeVersionLabel("2026-11")).toBe("2026-11")
  })
})
