import { describe, expect, it } from "bun:test"
import { purchaseReviewAfterVerification } from "./store-purchase-review"

describe("store purchase review", () => {
  it("retains an earlier unresolved purchase after another callback applies", () => {
    expect(purchaseReviewAfterVerification(true, true, false)).toBe(true)
  })

  it("allows a fully applied Restore receipt to clear prior review", () => {
    expect(purchaseReviewAfterVerification(true, true, true)).toBe(false)
  })

  it("requires review when a verification did not apply an entitlement", () => {
    expect(purchaseReviewAfterVerification(false, false, false)).toBe(true)
    expect(purchaseReviewAfterVerification(false, false, true)).toBe(true)
  })
})
