import { describe, expect, test } from "bun:test"
import { receiptCreateInput } from "./mobile-member-receipts-support.route"

const payload = {
  allocations: [{ amount: 25_000, category: "commitment" }],
  paidAt: "2026-11-14T00:00:00Z",
  totalAmount: 25_000,
}

describe("mobile receipt proof input", () => {
  test.each([
    "/api/uploads/8cbab17f-4393-404a-b6ce-2f16005660a0",
    "https://example.com/proof.pdf",
  ])("accepts %s", (proofDocumentUrl) => {
    expect(
      receiptCreateInput.safeParse({ ...payload, proofDocumentUrl }).success
    ).toBe(true)
  })

  test.each([
    "/api/uploads/not-an-id",
    "/api/uploads/8cbab17f-4393-404a-b6ce-2f16005660a0?token=extra",
    "//example.com/proof.pdf",
    "file:///cash-slip.pdf",
    "javascript:alert(1)",
  ])("rejects %s", (proofDocumentUrl) => {
    expect(
      receiptCreateInput.safeParse({ ...payload, proofDocumentUrl }).success
    ).toBe(false)
  })
})

describe("mobile receipt allocation input (T30)", () => {
  test("accepts a payment without a split for automatic allocation", () => {
    expect(
      receiptCreateInput.safeParse({ ...payload, allocations: [] }).success
    ).toBe(true)
  })

  test("accepts a share payment against an approved share purchase", () => {
    expect(
      receiptCreateInput.safeParse({
        ...payload,
        allocations: [
          {
            amount: 25_000,
            category: "shares",
            memberShareApplicationId: "share-application-1",
          },
        ],
      }).success
    ).toBe(true)
  })
})
