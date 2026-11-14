import { describe, expect, test } from "bun:test"
import {
  formatShareCount,
  getRemainingShares,
  getShareRequestStatusWord,
} from "./share-words"

describe("share words", () => {
  test("counts shares in plain words", () => {
    expect(formatShareCount(1)).toBe("1 share")
    expect(formatShareCount(5)).toBe("5 shares")
  })

  test("says waiting, approved or not approved", () => {
    expect(getShareRequestStatusWord("pending").label).toBe("Waiting")
    expect(getShareRequestStatusWord("rejected").label).toBe("Not approved")
  })

  test("never offers a negative number of shares", () => {
    expect(getRemainingShares({ maximumUnits: 20, totalPendingUnits: 7 })).toBe(
      13
    )
    expect(getRemainingShares({ maximumUnits: 5, totalPendingUnits: 9 })).toBe(
      0
    )
  })
})
