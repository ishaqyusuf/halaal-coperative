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

  test("maps the subscription authority into a member-expansion contract", () => {
    expect(
      toMobileMemberExpansion({
        enforcement: {
          canActivateMember: false,
          reason: "active_member_limit_reached",
        },
        plan: { code: "starter", displayName: "Starter" },
        usage: {
          activeMemberCount: 1,
          activeMemberLimit: 1,
          isAtCapacity: true,
        },
      })
    ).toEqual({
      activeMemberCount: 1,
      activeMemberLimit: 1,
      planCode: "starter",
      planName: "Starter",
      reason: "active_member_limit_reached",
      status: "at_capacity",
    })
  })
})
