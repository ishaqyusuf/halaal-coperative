import { describe, expect, test } from "bun:test"
import {
  assistantMessageLimit,
  assistantOverageLine,
  estimatePlatformBill,
  formatPlatformBillingPeriod,
  mobileAccessLine,
  platformBillingPeriod,
  previousPlatformBillingPeriod,
  seatFeeLine,
  validateAssistantMonthlyCap,
} from "./platform-billing"

describe("platform billing rules", () => {
  test("seat fee is ₦35 per active member and absent with no seats", () => {
    expect(seatFeeLine(0)).toBeNull()
    expect(seatFeeLine(12)).toMatchObject({
      kind: "seat_fee",
      quantity: 12,
      unitAmount: 35,
      amount: 420,
    })
  })

  test("assistant limit is the free 500 unless billing is on, then the cap buys more", () => {
    expect(assistantMessageLimit({ assistantAutoBilling: false, assistantMonthlyCap: 9000 })).toBe(500)
    expect(assistantMessageLimit({ assistantAutoBilling: true, assistantMonthlyCap: 0 })).toBe(500)
    expect(assistantMessageLimit({ assistantAutoBilling: true, assistantMonthlyCap: 1500 })).toBe(600)
    // ₦29 buys one ₦15 message, not two.
    expect(assistantMessageLimit({ assistantAutoBilling: true, assistantMonthlyCap: 29 })).toBe(501)
    expect(assistantMessageLimit({ assistantAutoBilling: true, assistantMonthlyCap: -5 })).toBe(500)
  })

  test("overage is ₦15 per billable message", () => {
    expect(assistantOverageLine(0)).toBeNull()
    expect(assistantOverageLine(40)).toMatchObject({ quantity: 40, unitAmount: 15, amount: 600 })
  })

  test("mobile line totals the month's terms", () => {
    expect(mobileAccessLine([])).toBeNull()
    expect(mobileAccessLine([{ amount: 1000 }, { amount: 1000 }])).toMatchObject({
      quantity: 2,
      unitAmount: 1000,
      amount: 2000,
    })
  })

  test("estimate adds the lines", () => {
    const estimate = estimatePlatformBill({
      seats: 10,
      assistantBillableMessages: 3,
      mobileTerms: [{ amount: 1000 }],
    })
    expect(estimate.lines.map((line) => line.kind)).toEqual(["seat_fee", "ai_overage", "mobile_access"])
    expect(estimate.total).toBe(350 + 45 + 1000)
  })

  test("periods follow the Lagos calendar", () => {
    // 23:30 UTC on 30 November is 00:30 on 1 December in Lagos.
    expect(platformBillingPeriod(new Date("2026-11-30T23:30:00Z"))).toBe("2026-12")
    expect(previousPlatformBillingPeriod("2027-01")).toBe("2026-12")
    expect(previousPlatformBillingPeriod("2026-11")).toBe("2026-10")
    expect(formatPlatformBillingPeriod("2026-11")).toBe("November 2026")
  })

  test("cap validation", () => {
    expect(validateAssistantMonthlyCap(0)).toBeNull()
    expect(validateAssistantMonthlyCap(2500.5)).toBeNull()
    expect(validateAssistantMonthlyCap(-1)).not.toBeNull()
    expect(validateAssistantMonthlyCap(1.234)).not.toBeNull()
  })
})
