import { describe, expect, test } from "bun:test"
import { buildMobileMemberStatementStats } from "./mobile-member-statement"

describe("mobile member statement", () => {
  test("keeps commitment savings financing and published dividends distinct", () => {
    const stats = buildMobileMemberStatementStats({
      activePlan: {
        amount: 60_000,
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      summary: {
        activeLoanCount: 1,
        contributionsCount: 8,
        dividendAllocationCount: 2,
        totalDividendAllocations: 12_500,
        totalEstimatedMonthlyServicing: 45_000,
        totalOutstandingPrincipal: 360_000,
        totalSavingsSnapshot: 480_000,
      },
    })

    expect(stats.map((stat) => stat.key)).toEqual([
      "active-commitment",
      "savings",
      "financing",
      "dividends",
    ])
    expect(stats.map((stat) => stat.value)).toEqual([
      60_000, 480_000, 360_000, 12_500,
    ])
    expect(stats[3]?.detail).toBe("2 published allocation(s)")
  })

  test("does not infer unavailable balances", () => {
    const stats = buildMobileMemberStatementStats({
      activePlan: null,
      summary: null,
    })

    expect(stats.every((stat) => stat.value === 0)).toBe(true)
    expect(stats[3]?.detail).toBe("No published dividends")
  })
})
