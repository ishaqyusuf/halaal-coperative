import { describe, expect, test } from "bun:test"
import {
  createDevFoodPurchaseApplication,
  createDevProcurementRequest,
  createDevProjectFinancingRequest,
  createDevSupportCase,
  getDevAdminMemberDetail,
  getDevAdminMembers,
  getDevMemberFoodPurchase,
  getDevSubscriptionSnapshot,
  inviteDevAdminAccess,
  replyDevSupportCase,
  requestDevPlanChange,
  reviewDevOnboarding,
  updateDevAdminMemberKyc,
  updateDevAdminMemberStatus,
} from "./mobile-dev-fixtures"

describe("mobile support development fixtures", () => {
  test("preserves linked receipt governance context", () => {
    const supportCase = createDevSupportCase({
      category: "payment_issue",
      description: "The submitted receipt allocation needs review.",
      linkedRecordId: "receipt-dev-linked",
      linkedRecordType: "receipt",
      moneyImpactRequested: true,
      subject: "Receipt allocation review",
    })

    expect(supportCase).toMatchObject({
      financialAdjustmentApprovalStatus: "pending",
      linkedRecordId: "receipt-dev-linked",
      linkedRecordType: "receipt",
      moneyImpactRequested: true,
      requiresFinancialAdjustment: true,
    })
  })

  test("attributes a member reply to the signed-in fixture member", () => {
    const supportCase = createDevSupportCase({
      category: "account_update",
      description: "Please confirm my profile update.",
      subject: "Profile update",
    })
    const replied = replyDevSupportCase(
      {
        message: "I have attached the requested confirmation.",
        supportCaseId: supportCase.id,
      },
      "member"
    )

    expect(replied.recentMessages.at(-1)).toMatchObject({
      authorName: "Yusuf Abdullahi",
      authorType: "member",
      message: "I have attached the requested confirmation.",
    })
  })
})

describe("mobile cooperative-service development fixtures", () => {
  test("returns the original canonical result for duplicate submission keys", () => {
    const procurementInput = {
      itemName: "Solar freezer",
      requestedCost: 480000,
      requestedRepaymentMonths: 12,
      submissionKey: "00000000-0000-4000-8000-000000000201",
    }
    const foodInput = {
      cycleId: getDevMemberFoodPurchase().cycles[0]!.id,
      requestedAmount: 80000,
      requestedPaybackMonths: 1,
      submissionKey: "00000000-0000-4000-8000-000000000202",
    }
    const projectInput = {
      businessName: "Barakah Cold Chain",
      proposedStructure: "repayable_facility" as const,
      requestedAmount: 1200000,
      requestedPaybackMonths: 18,
      submissionKey: "00000000-0000-4000-8000-000000000203",
    }

    expect(createDevProcurementRequest(procurementInput).id).toBe(
      createDevProcurementRequest(procurementInput).id
    )
    expect(createDevFoodPurchaseApplication(foodInput).id).toBe(
      createDevFoodPurchaseApplication(foodInput).id
    )
    expect(createDevProjectFinancingRequest(projectInput).id).toBe(
      createDevProjectFinancingRequest(projectInput).id
    )
  })
})

describe("mobile admin-member development fixtures", () => {
  test("completes approved onboarding and refreshes the member directory", () => {
    const before = getDevAdminMembers()
    const request = before.onboardingRequests[0]

    expect(request).toBeDefined()

    const result = reviewDevOnboarding({
      decision: "approved",
      requestId: request!.id,
      reviewNotes: "Verified for the deterministic mobile fixture.",
    })
    const after = getDevAdminMembers()

    expect(result).toEqual({ id: request!.id, status: "approved" })
    expect(after.onboardingRequests).toHaveLength(
      before.onboardingRequests.length - 1
    )
    expect(after.summary.totalCount).toBe(before.summary.totalCount + 1)
    expect(after.members[0]).toMatchObject({
      fullName: request!.fullName,
      linkedUserEmail: request!.email,
      memberNumber: request!.memberNumber,
      status: "active",
    })
  })

  test("keeps detail lifecycle and KYC state consistent after review", () => {
    const member = getDevAdminMembers().members.find(
      (item) => item.memberNumber === "HV-1024"
    )

    expect(member).toBeDefined()
    updateDevAdminMemberStatus({
      memberId: member!.id,
      reviewNotes: "Suspended for deterministic fixture verification.",
      status: "suspended",
    })
    updateDevAdminMemberKyc({
      kycReviewNotes:
        "Returned to review for deterministic fixture verification.",
      kycStatus: "pending",
      memberId: member!.id,
    })

    const detail = getDevAdminMemberDetail(member!.id)
    expect(detail.member).toMatchObject({
      kycStatus: "pending",
      status: "suspended",
    })
    expect(detail.sections[0]?.rows[0]).toMatchObject({
      detail: "Civil Servant member",
      status: "pending",
    })
  })
})

describe("mobile admin-access development fixtures", () => {
  test("returns an honest recipient setup handoff", () => {
    const invitation = inviteDevAdminAccess({
      email: "zainab.finance@ishaq.qa.test",
      fullName: "Zainab Bello",
      makeDefault: true,
      role: "finance_officer",
    })

    expect(invitation).toMatchObject({
      cooperativeNumber: "HAL-S-ZAINAB01",
      deliveryStatus: "development_fixture",
      email: "zainab.finance@ishaq.qa.test",
      role: "finance_officer",
      status: "invited",
    })
    expect(invitation.setupUrl).toContain("halaalvest://recovery?")
    expect(invitation.setupUrl).toContain(
      "email=zainab.finance%40ishaq.qa.test"
    )
  })
})

describe("mobile subscription development fixtures", () => {
  test("matches the authoritative five-plan catalogue and current-plan usage", () => {
    const snapshot = getDevSubscriptionSnapshot()

    expect(snapshot.availablePlans.map((plan) => plan.code)).toEqual([
      "free_beta",
      "starter",
      "standard",
      "growth",
      "enterprise",
    ])
    expect(
      snapshot.availablePlans.map((plan) => ({
        code: plan.code,
        limit: plan.activeMemberLimit,
        maximum: plan.monthlyPrice.maximum,
        minimum: plan.monthlyPrice.minimum,
      }))
    ).toEqual([
      { code: "free_beta", limit: 100, maximum: 0, minimum: 0 },
      { code: "starter", limit: 250, maximum: 18750, minimum: 12500 },
      { code: "standard", limit: 1000, maximum: 75000, minimum: 50000 },
      { code: "growth", limit: 3000, maximum: 225000, minimum: 150000 },
      { code: "enterprise", limit: null, maximum: null, minimum: null },
    ])
    expect(snapshot.plan.code).toBe("standard")
    expect(snapshot.usage).toMatchObject({
      activeMemberCount: 438,
      activeMemberLimit: 1000,
      remainingActiveMembers: 562,
      usagePercent: 44,
    })
    expect(snapshot.entitlements).toEqual(snapshot.plan.entitlements)
  })

  test("records an honest support handoff when checkout is unavailable", () => {
    const intent = requestDevPlanChange("growth")

    expect(intent).toMatchObject({
      checkoutAvailable: false,
      checkoutUrl: null,
      requestedPlanCode: "growth",
      status: "support_follow_up",
    })
    expect(intent.supportMessage).toContain("Billing support")
  })
})
