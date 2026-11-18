import { describe, expect, test } from "bun:test"
import {
  amountOf,
  contributionStatus,
  duplicatePeriodError,
  paymentTotal,
  splitFinancingPayment,
  validatePayment,
  validatePlanAmount,
  validateRow,
} from "./contribution-forms"
import type { CollectionBatchSummary } from "./admin-contribution-operations-types"

describe("contribution forms", () => {
  test("splits a financing payment into scheduled servicing then early payoff", () => {
    expect(splitFinancingPayment(60_000, 45_000)).toEqual({
      extraPayoff: 15_000,
      scheduled: 45_000,
    })
    expect(splitFinancingPayment(30_000, 45_000)).toEqual({
      extraPayoff: 0,
      scheduled: 30_000,
    })
    expect(splitFinancingPayment(10_000, 0)).toEqual({
      extraPayoff: 10_000,
      scheduled: 0,
    })
  })

  test("validates payment amounts like the approved design", () => {
    const draft = { committed: "25,000", financing: "x", special: "" }
    expect(validatePayment(draft, false)).toMatchObject({
      ok: true,
      total: 25_000,
    })
    expect(validatePayment(draft, true)).toEqual({
      error: "Enter valid payment amounts.",
      ok: false,
    })
    expect(
      validatePayment({ committed: "0", financing: "", special: "" }, true)
    ).toEqual({ error: "Enter at least one payment amount.", ok: false })
    expect(
      paymentTotal({ committed: "25,000", financing: "45,000", special: "5000" }, false)
    ).toBe(30_000)
  })

  test("checks plan and batch-row fields", () => {
    expect(validatePlanAmount("0").error).toBe(
      "Enter a commitment greater than zero."
    )
    expect(validatePlanAmount("30,000").amount).toBe(30_000)
    expect(
      validateRow({ amount: "", reason: "", status: "collected" })
    ).toEqual({ amount: "Enter the collected amount." })
    expect(
      validateRow({ amount: "", reason: " ", status: "exception" })
    ).toEqual({ reason: "Enter an exception reason." })
    expect(validateRow({ amount: "", reason: "", status: "skipped" })).toEqual(
      {}
    )
    expect(amountOf("-5")).toBeNull()
  })

  test("flags a period the source already staged", () => {
    const batch = {
      deductionSource: { id: "s1" },
      periodMonth: 11,
      periodYear: 2026,
    } as CollectionBatchSummary
    expect(
      duplicatePeriodError({
        batches: [batch],
        month: 11,
        sourceId: "s1",
        sourceName: "Kano State payroll",
        year: 2026,
      })
    ).toBe("Kano State payroll already has a November 2026 batch.")
    expect(
      duplicatePeriodError({
        batches: [batch],
        month: 11,
        sourceId: "s2",
        sourceName: "Jaiz Bank",
        year: 2026,
      })
    ).toBeNull()
  })

  test("labels statuses with the design's tones", () => {
    expect(contributionStatus("partially_posted")).toEqual({
      label: "Partly posted",
      tone: "warning",
    })
    expect(contributionStatus("on_hold").label).toBe("On hold")
  })
})
