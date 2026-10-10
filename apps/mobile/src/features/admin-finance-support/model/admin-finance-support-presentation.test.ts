import { describe, expect, test } from "bun:test"
import type { AdminFinanceSupportOverview } from "./admin-finance-support-types"
import {
  buildAdminFinanceSupportPresentation,
  formatAdminFinanceAge,
  getAdminFinanceQueueCount,
} from "./admin-finance-support-presentation"

function buildOverview(
  overrides: Partial<AdminFinanceSupportOverview> = {}
): AdminFinanceSupportOverview {
  return {
    capabilities: {
      approveMoneyImpactSupport: true,
      manageSupport: true,
      recordCollectionFollowUp: true,
      reviewFinancing: true,
      reviewFoodPurchase: true,
      reviewProcurement: true,
      reviewProjectFinancing: true,
      reviewReceipts: true,
      reviewShares: true,
    },
    generatedAt: "2026-09-04T09:00:00.000Z",
    items: [],
    queueCounts: [
      { count: 4, key: "financing", label: "Financing" },
      { count: 3, key: "receipts", label: "Receipts" },
    ],
    state: "ready",
    stats: [
      { format: "count", key: "visible-work", label: "Visible work", value: 7 },
      { format: "count", key: "blocked-work", label: "Blocked", value: 2 },
      {
        format: "currency",
        key: "deployable-funds",
        label: "Deployable funds",
        value: 4_820_000,
      },
    ],
    ...overrides,
  }
}

describe("admin finance support presentation", () => {
  test("preserves authoritative decision metrics", () => {
    expect(buildAdminFinanceSupportPresentation(buildOverview())).toEqual({
      blockedCount: 2,
      deployableFunds: 4_820_000,
      filteredCount: 0,
      totalCount: 7,
    })
  })

  test("falls back to server queue counts when summary metrics are absent", () => {
    const result = buildAdminFinanceSupportPresentation(
      buildOverview({ stats: [] })
    )

    expect(result.totalCount).toBe(7)
    expect(result.blockedCount).toBe(0)
    expect(result.deployableFunds).toBeNull()
  })

  test("returns stable filter counts without inventing missing categories", () => {
    const overview = buildOverview()
    expect(getAdminFinanceQueueCount(overview, "all")).toBe(7)
    expect(getAdminFinanceQueueCount(overview, "financing")).toBe(4)
    expect(getAdminFinanceQueueCount(overview, "support")).toBe(0)
  })

  test("formats queue age at minute, hour, and day boundaries", () => {
    expect(formatAdminFinanceAge(42)).toBe("42m waiting")
    expect(formatAdminFinanceAge(180)).toBe("3h waiting")
    expect(formatAdminFinanceAge(1440)).toBe("1d waiting")
  })
})
