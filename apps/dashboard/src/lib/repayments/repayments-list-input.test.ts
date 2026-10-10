import { describe, expect, test } from "bun:test"
import {
  getRepaymentHistoryListInput,
  getRepaymentScheduleListInput,
} from "./repayments-list-input"

const baseFilters = {
  assignedToUserId: "assignee-1",
  dateRange: ["2026-08-01", "2026-08-31"],
  memberId: "member-1",
  q: "Amina",
  repaymentStatus: "posted" as const,
  resolutionStatus: "open" as const,
  scheduleStatus: "overdue" as const,
  stage: "active" as const,
  view: "collections" as const,
}

describe("repayment list input", () => {
  test("normalizes collections schedule controls for the API contract", () => {
    expect(
      getRepaymentScheduleListInput(baseFilters, ["dueAt", "asc"], {
        collectionsOnly: true,
      })
    ).toEqual({
      assignedToUserId: "assignee-1",
      collectionsOnly: true,
      fromDate: new Date("2026-08-01T00:00:00.000Z"),
      memberId: "member-1",
      q: "Amina",
      resolutionStatus: "open",
      sort: ["dueAt", "asc"],
      stage: "active",
      status: "overdue",
      toDate: new Date("2026-08-31T23:59:59.999Z"),
    })
  })

  test("keeps history input limited to history controls", () => {
    expect(
      getRepaymentHistoryListInput(baseFilters, ["paidAt", "desc"])
    ).toEqual({
      fromDate: new Date("2026-08-01T00:00:00.000Z"),
      memberId: "member-1",
      q: "Amina",
      sort: ["paidAt", "desc"],
      status: "posted",
      toDate: new Date("2026-08-31T23:59:59.999Z"),
    })
  })

  test("drops unsupported sort fields", () => {
    expect(
      getRepaymentScheduleListInput(baseFilters, ["amount", "desc"])
        .sort
    ).toBeUndefined()
    expect(
      getRepaymentHistoryListInput(baseFilters, ["dueAt", "asc"]).sort
    ).toBeUndefined()
  })

  test("forces the collections view to overdue regardless of stale URL status", () => {
    expect(
      getRepaymentScheduleListInput(
        { ...baseFilters, scheduleStatus: "paid" },
        null,
        { collectionsOnly: true }
      ).status
    ).toBe("overdue")
  })
})
