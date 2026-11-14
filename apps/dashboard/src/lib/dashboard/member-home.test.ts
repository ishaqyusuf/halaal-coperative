import { describe, expect, test } from "bun:test"
import type { MemberHomeInProgress } from "@halaalvest/db"
import { getMemberStatusWord, getMemberWaitingItems } from "./member-home"

const none: MemberHomeInProgress = {
  foodPurchaseRequests: 0,
  guarantorRequests: 0,
  helpRepliesNeeded: 0,
  loanRequests: 0,
  openHelpRequests: 0,
  procurementRequests: 0,
  projectFinancingRequests: 0,
  receiptsBeingChecked: 0,
  receiptsToFix: 0,
  shareRequests: 0,
}

describe("member home waiting items", () => {
  test("shows nothing when nothing is waiting", () => {
    expect(getMemberWaitingItems(none)).toEqual([])
  })

  test("puts what the member must do first, in plain words", () => {
    const items = getMemberWaitingItems({
      ...none,
      loanRequests: 1,
      receiptsBeingChecked: 2,
      receiptsToFix: 1,
    })

    expect(
      items.map((item) => [item.count, item.label, item.needsYou])
    ).toEqual([
      [1, "payment receipt to correct", true],
      [2, "payment receipts being checked", false],
      [1, "loan request being reviewed", false],
    ])
  })

  test("says when an active member still waits for checks", () => {
    expect(getMemberStatusWord("active", true)).toBe("Active")
    expect(getMemberStatusWord("active", false)).toBe("Waiting for checks")
  })
})
