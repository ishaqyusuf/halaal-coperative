import { describe, expect, test } from "bun:test"
import type { AdminFinanceSupportItem } from "./admin-finance-support-types"
import {
  financeDeskItemStatus,
  formatAdminFinanceAge,
  matchesFinanceDeskSearch,
} from "./admin-finance-support-presentation"

const item = {
  ageMinutes: 1440,
  allowedActions: [],
  amount: 37_500,
  blockers: [],
  details: [],
  displayState: "overdue",
  financialAdjustmentApprovalStatus: null,
  id: "schedule-1",
  member: { id: "member-1", name: "Bashir Yakubu", number: "QHC-0035" },
  policyEvidence: [],
  queueKey: "collections",
  requestedAt: "2026-11-16T09:00:00Z",
  requiresFinancialAdjustment: false,
  state: "due",
  subtitle: "Murabaha installment 4 of 12",
  title: "Bashir Yakubu",
} satisfies AdminFinanceSupportItem

describe("admin finance desk presentation", () => {
  test("presents derived lateness and retains the expected command state", () => {
    expect(financeDeskItemStatus(item)).toEqual({
      label: "Overdue",
      tone: "danger",
    })
    expect(item.state).toBe("due")
    expect(
      financeDeskItemStatus({
        ...item,
        displayState: undefined,
        state: "under_review",
      })
    ).toEqual({ label: "In review", tone: "lilac" })
  })

  test("matches a member's name, membership number, or record summary", () => {
    expect(matchesFinanceDeskSearch(item, "  baSHIR ")).toBe(true)
    expect(matchesFinanceDeskSearch(item, "QHC-0035")).toBe(true)
    expect(matchesFinanceDeskSearch(item, " murabaha ")).toBe(true)
    expect(matchesFinanceDeskSearch(item, "Ibrahim")).toBe(false)
  })

  test("formats queue age at minute, hour, and day boundaries", () => {
    expect(formatAdminFinanceAge(42)).toBe("42m waiting")
    expect(formatAdminFinanceAge(180)).toBe("3h waiting")
    expect(formatAdminFinanceAge(1440)).toBe("1d waiting")
  })
})
