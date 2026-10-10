import { describe, expect, test } from "bun:test"
import type { MobileMemberFoodPurchase } from "./member-food-purchase-types"
import { presentMemberFoodPurchaseForQa } from "./member-food-purchase-qa"

const foodPurchase = {
  applicationNextCursor: "next-page",
  applications: [{ id: "application-1" }],
  canCreateApplication: true,
  capability: {
    accessMode: "member_self_service",
    canMemberCreate: true,
    canViewExisting: true,
  },
  cycles: [{ id: "cycle-1", status: "open" }],
  generatedAt: "2026-08-31T09:00:00.000Z",
  restrictionReasons: [],
  summary: {
    approvedApplications: 0,
    openCycles: 1,
    pendingApplications: 1,
    totalApplications: 1,
  },
} as unknown as MobileMemberFoodPurchase

describe("member Foodstuff Purchase QA presentation", () => {
  test("keeps an open cycle while emptying application history", () => {
    const result = presentMemberFoodPurchaseForQa(foodPurchase, "empty")

    expect(result.applications).toEqual([])
    expect(result.summary.totalApplications).toBe(0)
    expect(result.summary.openCycles).toBe(1)
    expect(result.cycles).toHaveLength(1)
    expect(result.canCreateApplication).toBe(true)
    expect(result.capability.accessMode).toBe("member_self_service")
    expect(result.capability.canMemberCreate).toBe(true)
    expect(result.restrictionReasons).toEqual([])
  })

  test("models every Operation Profile access mode", () => {
    const disabled = presentMemberFoodPurchaseForQa(foodPurchase, "disabled")
    const officeOnly = presentMemberFoodPurchaseForQa(
      foodPurchase,
      "office-only"
    )
    const readOnly = presentMemberFoodPurchaseForQa(foodPurchase, "read-only")

    expect(disabled.capability.accessMode).toBe("disabled")
    expect(disabled.capability.canViewExisting).toBe(true)
    expect(disabled.applications).toHaveLength(1)
    expect(officeOnly.capability.accessMode).toBe("office_only")
    expect(readOnly.capability.accessMode).toBe("read_only")
    expect(readOnly.applications).toHaveLength(1)
  })
})
