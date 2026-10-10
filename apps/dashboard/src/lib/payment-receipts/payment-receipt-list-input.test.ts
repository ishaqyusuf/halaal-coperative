import { describe, expect, it } from "bun:test"
import {
  getPaymentReceiptListInput,
  getPaymentReceiptSort,
} from "./payment-receipt-list-input"

describe("payment receipt list input", () => {
  it("normalizes the shared server and client query shape", () => {
    expect(
      getPaymentReceiptListInput(
        { q: "  payroll ", status: "under_review" },
        ["amount", "desc"],
        "payroll"
      )
    ).toEqual({
      q: "payroll",
      sort: ["totalAmount", "desc"],
      status: "under_review",
    })
  })

  it("rejects unsupported status and sort values", () => {
    expect(
      getPaymentReceiptListInput({ q: null, status: "posted" }, [
        "unknown",
        "desc",
      ])
    ).toEqual({ q: undefined, sort: null, status: undefined })
    expect(getPaymentReceiptSort(["amount", "sideways"])).toBeNull()
  })
})
