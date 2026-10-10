import { describe, expect, test } from "bun:test"

import {
  buildMobileAdminFinanceSupportActions,
  deriveMobileAdminCommandAuditId,
  type MobileAdminFinanceSupportCapabilities,
} from "./mobile-admin-finance-support-policy"

const financeCapabilities: MobileAdminFinanceSupportCapabilities = {
  approveMoneyImpactSupport: true,
  manageSupport: true,
  recordCollectionFollowUp: true,
  reviewFinancing: true,
  reviewFoodPurchase: true,
  reviewProcurement: true,
  reviewProjectFinancing: true,
  reviewReceipts: true,
  reviewShares: true,
}

const operationsCapabilities: MobileAdminFinanceSupportCapabilities = {
  approveMoneyImpactSupport: false,
  manageSupport: true,
  recordCollectionFollowUp: true,
  reviewFinancing: false,
  reviewFoodPurchase: true,
  reviewProcurement: false,
  reviewProjectFinancing: false,
  reviewReceipts: false,
  reviewShares: false,
}

describe("mobile admin finance and support policy", () => {
  test("keeps finance approvals out of the operations action surface", () => {
    expect(
      buildMobileAdminFinanceSupportActions({
        capabilities: operationsCapabilities,
        financialAdjustmentApprovalStatus: null,
        queueKey: "receipts",
        requiresFinancialAdjustment: false,
        state: "submitted",
      })
    ).toEqual([])

    expect(
      buildMobileAdminFinanceSupportActions({
        capabilities: operationsCapabilities,
        financialAdjustmentApprovalStatus: null,
        queueKey: "foodPurchase",
        requiresFinancialAdjustment: false,
        state: "submitted",
      }).map((action) => action.key)
    ).toEqual(["mark_under_review", "approve", "reject"])
  })

  test("exposes governance-only support adjustment review to finance", () => {
    const actions = buildMobileAdminFinanceSupportActions({
      capabilities: financeCapabilities,
      financialAdjustmentApprovalStatus: "pending",
      queueKey: "support",
      requiresFinancialAdjustment: true,
      state: "in_progress",
    })

    expect(actions.map((action) => action.key)).toEqual([
      "reply",
      "update_support_status",
      "review_financial_adjustment",
    ])
    expect(
      actions.find((action) => action.key === "review_financial_adjustment")
        ?.governanceOnly
    ).toBe(true)
  })

  test("does not offer terminal records another review transition", () => {
    expect(
      buildMobileAdminFinanceSupportActions({
        capabilities: financeCapabilities,
        financialAdjustmentApprovalStatus: null,
        queueKey: "financing",
        requiresFinancialAdjustment: false,
        state: "approved",
      })
    ).toEqual([])
  })

  test("derives stable tenant-scoped UUID audit claims", () => {
    const commandId = "00000000-0000-4000-8000-000000000801"
    const first = deriveMobileAdminCommandAuditId("tenant-a", commandId)

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
    expect(deriveMobileAdminCommandAuditId("tenant-a", commandId)).toBe(first)
    expect(deriveMobileAdminCommandAuditId("tenant-b", commandId)).not.toBe(
      first
    )
  })
})
