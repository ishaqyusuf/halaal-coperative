import { describe, expect, test } from "bun:test"
import {
  getMobileAdminProcurementEffectiveScheduleState,
  validateMobileAdminProcurementPurchaseDates,
} from "./mobile-admin-procurement-operations"

describe("mobile admin procurement operations policy", () => {
  const asOf = new Date("2026-08-30T18:00:00.000Z")

  test("derives due and overdue states without mutating terminal states", () => {
    expect(
      getMobileAdminProcurementEffectiveScheduleState(
        { dueDate: new Date("2026-08-29T00:00:00.000Z"), status: "pending" },
        asOf
      )
    ).toBe("overdue")
    expect(
      getMobileAdminProcurementEffectiveScheduleState(
        { dueDate: new Date("2026-08-30T00:00:00.000Z"), status: "pending" },
        asOf
      )
    ).toBe("due")
    expect(
      getMobileAdminProcurementEffectiveScheduleState(
        { dueDate: new Date("2026-08-01T00:00:00.000Z"), status: "paid" },
        asOf
      )
    ).toBe("paid")
    expect(
      getMobileAdminProcurementEffectiveScheduleState(
        { dueDate: new Date("2026-08-01T00:00:00.000Z"), status: "waived" },
        asOf
      )
    ).toBe("waived")
  })

  test("preserves partial payment state before its due date", () => {
    expect(
      getMobileAdminProcurementEffectiveScheduleState(
        {
          dueDate: new Date("2026-09-30T00:00:00.000Z"),
          status: "partially_paid",
        },
        asOf
      )
    ).toBe("partially_paid")
  })

  test("rejects impossible purchase dates and reverse repayment schedules", () => {
    expect(() =>
      validateMobileAdminProcurementPurchaseDates({
        firstDueDate: "2026-03-30",
        purchaseDate: "2026-02-31",
      })
    ).toThrow("Purchase date is invalid")

    expect(() =>
      validateMobileAdminProcurementPurchaseDates({
        firstDueDate: "2026-08-29",
        purchaseDate: "2026-08-30",
      })
    ).toThrow("First due date cannot be before the purchase date")
  })

  test("accepts a due date on or after the purchase date", () => {
    const result = validateMobileAdminProcurementPurchaseDates({
      firstDueDate: "2026-09-30",
      purchaseDate: "2026-08-30",
    })

    expect(result.purchaseDate.toISOString()).toStartWith("2026-08-30")
    expect(result.firstDueDate.toISOString()).toStartWith("2026-09-30")
  })
})
