import { describe, expect, test } from "bun:test"
import {
  createDevFoodPurchaseApplication,
  createDevProcurementRequest,
  createDevProjectFinancingRequest,
  createDevSupportCase,
  getDevAdminMemberDetail,
  getDevAdminMembers,
  getDevMemberFoodPurchase,
  inviteDevAdminAccess,
  replyDevSupportCase,
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
