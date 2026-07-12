import { describe, expect, test } from "bun:test"
import { buildPaymentReceiptCategoryOptions } from "./load-payment-receipts-page"

function categoryValues(
  input: Parameters<typeof buildPaymentReceiptCategoryOptions>[0]
) {
  return buildPaymentReceiptCategoryOptions(input).map((option) => option.value)
}

describe("payment receipt category availability", () => {
  test("hides procurement and food purchase categories when disabled with no payable obligations", () => {
    const categories = categoryValues({
      foodPurchaseAccessMode: "disabled",
      foodPurchaseApplicationsCount: 0,
      procurementAccessMode: "disabled",
      procurementSchedulesCount: 0,
    })

    expect(categories).not.toContain("procurement")
    expect(categories).not.toContain("food_purchase")
    expect(categories).toContain("commitment")
    expect(categories).toContain("shares")
  })

  test("keeps disabled procurement and food purchase settlement categories when payable obligations exist", () => {
    const categories = categoryValues({
      foodPurchaseAccessMode: "disabled",
      foodPurchaseApplicationsCount: 1,
      procurementAccessMode: "disabled",
      procurementSchedulesCount: 1,
    })

    expect(categories).toContain("procurement")
    expect(categories).toContain("food_purchase")
  })

  test("keeps procurement and food purchase categories visible when services are read-only", () => {
    const categories = categoryValues({
      foodPurchaseAccessMode: "read_only",
      foodPurchaseApplicationsCount: 0,
      procurementAccessMode: "read_only",
      procurementSchedulesCount: 0,
    })

    expect(categories).toContain("procurement")
    expect(categories).toContain("food_purchase")
  })
})
