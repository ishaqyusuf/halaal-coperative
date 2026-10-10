import { describe, expect, test } from "bun:test"
import {
  getMobileReportCatalog,
  getMobileReportRowLimit,
  MOBILE_REPORT_KEYS,
} from "./mobile-reports"
import type { SubscriptionEntitlements } from "./subscriptions"

function entitlements(
  reportDepth: SubscriptionEntitlements["reportDepth"],
  auditDepth: SubscriptionEntitlements["auditDepth"],
): SubscriptionEntitlements {
  return {
    auditDepth,
    coreFinance: true,
    customDomain: false,
    emailNotifications: "admin_only",
    memberLogin: true,
    memberStatements: "member_and_admin",
    reportDepth,
    roleDepth: "finance_operations",
    whatsAppNotifications: "pilot",
    whiteLabel: "unavailable",
  }
}

describe("mobile report catalogue policy", () => {
  test("keeps every required report visible while availability remains server owned", () => {
    const catalog = getMobileReportCatalog(entitlements("basic", "basic"))

    expect(catalog.map((item) => item.key)).toEqual(MOBILE_REPORT_KEYS)
    expect(catalog.find((item) => item.key === "members")?.available).toBe(true)
    expect(catalog.find((item) => item.key === "openingBalances")?.available).toBe(
      false,
    )
    expect(catalog.find((item) => item.key === "audit")?.available).toBe(false)
  })

  test("uses independent bounded report and audit row limits", () => {
    expect(getMobileReportRowLimit("full", "basic", "contributions")).toBe(
      2_500,
    )
    expect(getMobileReportRowLimit("full", "basic", "audit")).toBe(100)
    expect(getMobileReportRowLimit("custom", "custom", "audit")).toBe(10_000)
  })
})
