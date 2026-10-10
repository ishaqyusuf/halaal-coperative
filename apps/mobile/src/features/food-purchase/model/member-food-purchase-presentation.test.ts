import { describe, expect, test } from "bun:test"
import type {
  MobileFoodPurchaseApplication,
  MobileWorkflowChargeOption,
} from "./member-food-purchase-types"
import {
  parseFoodPurchaseAmount,
  presentFoodPurchaseApplication,
  presentFoodPurchaseCharges,
  presentFoodPurchaseObligation,
} from "./member-food-purchase-presentation"

const application = {
  approvedAmount: 150_000,
  approvedPaybackMonths: 3,
  cycle: {
    id: "cycle-1",
    periodMonth: "2026-08-01T00:00:00.000Z",
    releasedAmount: 12_000_000,
    status: "open",
  },
  id: "application-1",
  itemDescription: "Rice, beans, oil, and household provisions.",
  paidAmount: 50_000,
  paidAt: "2026-08-05T00:00:00.000Z",
  requestedAmount: 150_000,
  requestedAt: "2026-08-02T00:00:00.000Z",
  requestedPaybackMonths: 3,
  requestNotes: null,
  reviewNotes: null,
  status: "approved",
} satisfies MobileFoodPurchaseApplication

describe("member Foodstuff Purchase presentation", () => {
  test("presents an approved obligation without client-side shrink decisions", () => {
    const result = presentFoodPurchaseObligation(application, "NGN")

    expect(result.remaining).toContain("100,000")
    expect(result.paidSummary).toContain("50,000")
    expect(result.progressPercent).toBeCloseTo(33.333, 2)
    expect(result.payback).toBe("3 months")
  })

  test("presents one concise divided history row", () => {
    const result = presentFoodPurchaseApplication(application, "NGN")

    expect(result.title).toBe(application.itemDescription)
    expect(result.status).toBe("Approved")
    expect(result.amountLabel).toBe("approved")
    expect(result.remainingLabel).toBe("remaining")
    expect(result.accessibilityLabel).toContain("Approved")
  })

  test("keeps requested applications distinct from approved obligations", () => {
    const result = presentFoodPurchaseApplication(
      {
        ...application,
        approvedAmount: null,
        paidAmount: 0,
        status: "pending",
      },
      "NGN"
    )

    expect(result.amountLabel).toBe("requested")
    expect(result.remaining).toBe("3 months")
    expect(result.remainingLabel).toBe("payback")
  })

  test("parses formatted amounts and estimates fixed and percentage charges", () => {
    const charges = [
      {
        amount: 1_500,
        chargeValueType: "fixed_amount",
        code: "fixed",
        collectionMode: "included",
        id: "fixed",
        name: "Administration",
      },
      {
        amount: 2,
        chargeValueType: "percentage",
        code: "percent",
        collectionMode: "included",
        id: "percent",
        name: "Handling",
      },
    ] satisfies MobileWorkflowChargeOption[]

    expect(parseFoodPurchaseAmount("150,000")).toBe(150_000)
    expect(presentFoodPurchaseCharges(charges, 150_000).total).toBe(4_500)
  })
})
