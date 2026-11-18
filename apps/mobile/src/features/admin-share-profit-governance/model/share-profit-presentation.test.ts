import { describe, expect, test } from "bun:test"
import type { ProfitEntry, ProfitPeriod } from "./admin-share-profit-governance-types"
import {
  clampUnits,
  daysSince,
  entryStage,
  evidenceError,
  holdingAfter,
  periodChips,
  periodStage,
} from "./share-profit-presentation"

const entry = (status: ProfitEntry["status"], reconcile = true) =>
  ({ allocationsReconcile: reconcile, status }) as ProfitEntry
const period = (overrides: Partial<ProfitPeriod>) =>
  ({
    entries: [],
    pendingApprovalCount: 0,
    readyToPublishCount: 0,
    status: "draft",
    ...overrides,
  }) as ProfitPeriod

describe("shares and profit presentation", () => {
  test("places entries and periods on the lifecycle", () => {
    expect(entryStage("reviewed")).toBe(1)
    expect(entryStage("completed")).toBe(4)
    expect(periodStage(period({ entries: [entry("approved"), entry("reviewed")] }))).toBe(1)
    expect(periodStage(period({ status: "published" }))).toBe(4)
  })

  test("labels period cards with the work waiting", () => {
    expect(periodChips(period({ entries: [entry("reviewed", false)], pendingApprovalCount: 1 }))).toEqual([
      { label: "Doesn’t reconcile", tone: "danger" },
    ])
    expect(periodChips(period({ pendingApprovalCount: 1, readyToPublishCount: 2 }))).toEqual([
      { label: "1 to approve", tone: "warning" },
      { label: "2 to publish", tone: "brand" },
    ])
    expect(periodChips(period({ status: "published" }))[0]!.label).toBe("Published")
  })

  test("checks review inputs", () => {
    expect(evidenceError(" ")).not.toBeNull()
    expect(evidenceError("Matched in the bank statement")).toBeNull()
    expect(clampUnits(0, 5)).toBe(1)
    expect(clampUnits(9, 5)).toBe(5)
    expect(holdingAfter({ approvedOptionalUnits: 30, compulsoryUnits: 10 }, 5)).toBe(45)
    expect(daysSince("2026-11-10T00:00:00.000Z", Date.parse("2026-11-17T12:00:00.000Z"))).toBe(7)
  })
})
