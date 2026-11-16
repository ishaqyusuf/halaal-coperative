import { describe, expect, test } from "bun:test"
import {
  getMobileAdminLifecycleOverview,
  orderMobileAdminActionQueue,
  toMobileMemberExpansion,
} from "./mobile-admin-member-lifecycle"

describe("mobile admin lifecycle overview", () => {
  test("projects the production metric order without a database runtime", async () => {
    const previous = process.env.HALAALVEST_DATABASE_URL
    delete process.env.HALAALVEST_DATABASE_URL
    try {
      const overview = await getMobileAdminLifecycleOverview("tenant-1")
      expect(overview.stats.map((metric) => metric.key)).toEqual([
        "deployable-funds",
        "collection-coverage",
        "portfolio-risk",
      ])
      expect(overview.actionQueue).toEqual([])
      expect(overview.complianceWatch).toEqual([])
      expect(overview.recentActivity).toEqual([])
    } finally {
      if (previous) process.env.HALAALVEST_DATABASE_URL = previous
    }
  })

  test("orders urgent exceptions first and preserves canonical peer order", () => {
    const ordered = orderMobileAdminActionQueue([
      {
        count: 2,
        href: "/members",
        key: "member-review",
        label: "Member reviews",
        severity: "warning",
      },
      {
        count: 1,
        href: "/repayments",
        key: "overdue",
        label: "Overdue follow-ups",
        severity: "critical",
      },
      {
        count: 0,
        href: "/imports",
        key: "failed-imports",
        label: "Failed imports",
        severity: "critical",
      },
      {
        count: 3,
        href: "/support",
        key: "support",
        label: "Support cases",
        severity: "warning",
      },
    ])

    expect(ordered.map((item) => item.key)).toEqual([
      "overdue",
      "member-review",
      "support",
    ])
  })

  test("always reports member expansion as available, with no member cap", () => {
    // Triage 2.8: the old plan's active-member cap is gone. Installed mobile
    // builds read this shape, so it stays, always allowed.
    for (const activeMemberCount of [0, 100, 1_000_000]) {
      expect(toMobileMemberExpansion(activeMemberCount)).toEqual({
        activeMemberCount,
        activeMemberLimit: null,
        planCode: null,
        planName: null,
        reason: null,
        status: "available",
      })
    }
  })
})
