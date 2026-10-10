import { describe, expect, test } from "bun:test"
import type { MobileAdminOverview } from "./admin-member-lifecycle-types"
import { buildAdminOverviewPresentation } from "./admin-overview-presentation"

function buildOverview(
  overrides: Partial<MobileAdminOverview> = {}
): MobileAdminOverview {
  return {
    actionQueue: [
      {
        count: 7,
        detail: "Finance decisions",
        key: "finance",
        label: "Finance reviews",
        severity: "warning",
      },
      {
        count: 3,
        detail: "Member decisions",
        key: "members",
        label: "Member onboarding",
        severity: "neutral",
      },
    ],
    complianceWatch: [],
    generatedAt: "2026-08-11T09:40:00.000Z",
    recentActivity: [],
    stats: [
      {
        detail: "1 pending onboarding",
        format: "count",
        key: "members",
        label: "Active members",
        value: 1248,
      },
      {
        detail: "94% on schedule",
        format: "currency",
        key: "collections",
        label: "Collections",
        value: 42_000_000,
      },
      {
        detail: "Across active facilities",
        format: "currency",
        key: "portfolio",
        label: "Financing portfolio",
        value: 18_400_000,
      },
    ],
    warnings: [],
    ...overrides,
  }
}

describe("admin overview presentation", () => {
  test("leads with the authoritative collections metric", () => {
    const result = buildAdminOverviewPresentation(buildOverview())

    expect(result.primaryMetric?.key).toBe("collections")
    expect(result.supportingMetrics.map((metric) => metric.key)).toEqual([
      "members",
      "portfolio",
    ])
    expect(result.schedulePercentage).toBe(94)
  })

  test("totals server-owned decision counts without changing queue order", () => {
    const overview = buildOverview()
    const result = buildAdminOverviewPresentation(overview)

    expect(result.decisionCount).toBe(10)
    expect(overview.actionQueue.map((item) => item.key)).toEqual([
      "finance",
      "members",
    ])
  })

  test("falls back to the first metric when collections are unavailable", () => {
    const result = buildAdminOverviewPresentation(
      buildOverview({
        stats: [
          {
            detail: "Current membership",
            format: "count",
            key: "members",
            label: "Members",
            value: 4,
          },
        ],
      })
    )

    expect(result.primaryMetric?.key).toBe("members")
    expect(result.supportingMetrics).toEqual([])
    expect(result.schedulePercentage).toBeNull()
  })

  test("does not invent progress from malformed or out-of-range details", () => {
    for (const detail of ["On schedule", "104% on schedule", "-2% delayed"]) {
      const result = buildAdminOverviewPresentation(
        buildOverview({
          stats: [
            {
              detail,
              format: "currency",
              key: "collections",
              label: "Collections",
              value: 10,
            },
          ],
        })
      )

      expect(result.schedulePercentage).toBeNull()
    }
  })
})
