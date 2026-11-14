import { describe, expect, test } from "bun:test"
import {
  getAttentionLabel,
  getOverviewAttentionItems,
} from "./overview-attention"

const queue = [
  {
    count: 2,
    href: "/membership-approvals?status=pending_approval",
    key: "membership-approvals",
    label: "Membership approvals",
    severity: "warning" as const,
  },
  {
    count: 0,
    href: "/loans",
    key: "financing-approvals",
    label: "Financing approvals",
    severity: "warning" as const,
  },
  {
    count: 1,
    href: "/repayments?view=schedule&scheduleStatus=overdue",
    key: "overdue-follow-ups",
    label: "Overdue follow-ups",
    severity: "critical" as const,
  },
  {
    count: 1,
    href: "/getting-started",
    key: "setup-warnings",
    label: "Setup warnings",
    severity: "neutral" as const,
  },
]

describe("overview attention items", () => {
  test("keeps only open work, urgent first, in plain words", () => {
    const items = getOverviewAttentionItems(queue, "tenant_admin")

    expect(items.map((item) => [item.count, item.label])).toEqual([
      [1, "late repayment"],
      [2, "people waiting to join"],
    ])
  })

  test("drops work the role cannot open", () => {
    const items = getOverviewAttentionItems(queue, "finance_officer")

    expect(items.map((item) => item.key)).not.toContain("membership-approvals")
  })

  test("falls back to the server label for an unknown queue", () => {
    expect(getAttentionLabel("new-queue", 3, "New queue")).toBe("New queue")
    expect(getAttentionLabel("support-cases", 1, "x")).toBe("open help request")
  })
})
