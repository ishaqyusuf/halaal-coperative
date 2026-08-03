import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

describe("mobileRouter", () => {
  const originalDatabaseUrl = process.env.HALAALVEST_DATABASE_URL
  const createCaller = createCallerFactory(appRouter)

  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl) {
      process.env.HALAALVEST_DATABASE_URL = originalDatabaseUrl
    }
  })

  async function createMobileCaller(input: {
    membershipId: string
    tenantId?: string
    userId?: string
  }) {
    const token = await createSignedSessionToken({
      membershipId: input.membershipId,
      scope: platformSessionScope,
      tenantId: input.tenantId ?? "tenant-amanah-demo",
      userId: input.userId ?? "user-tenant-admin-amanah",
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )

    return createCaller(context)
  }

  test("returns member home for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const home = await caller.mobile.member.home()

    expect(home.readiness.status).toBe("missing_profile")
    expect(home.member).toBeNull()
    expect(home.stats.map((stat) => stat.key)).toEqual([
      "commitment",
      "savings",
      "financing",
    ])
  })

  test("rejects member home when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.home()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("returns member more hub for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const hub = await caller.mobile.member.more()

    expect(hub.member).toBeNull()
    expect(hub.generatedAt).toEqual(expect.any(String))
    expect(hub.sections.map((section) => section.key)).toEqual(["profile"])
    expect(hub.sections[0]?.rows[0]?.key).toBe("member-profile")
  })

  test("rejects member more hub when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.more()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("returns member statement for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const statement = await caller.mobile.member.statement()

    expect(statement.member).toBeNull()
    expect(statement.generatedAt).toEqual(expect.any(String))
    expect(statement.stats.map((stat) => stat.key)).toEqual([
      "active-commitment",
      "savings",
      "financing",
      "dividends",
    ])
    expect(statement.sections.map((section) => section.key)).toEqual([
      "profile",
    ])
    expect(statement.sections[0]?.rows[0]?.key).toBe("member-profile")
  })

  test("rejects member statement when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.statement()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("returns member sections for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    for (const section of ["commitments", "financing", "shares"] as const) {
      const response = await caller.mobile.member.section({ section })

      expect(response.key).toBe(section)
      expect(response.title).toEqual(expect.any(String))
      expect(response.generatedAt).toEqual(expect.any(String))
      expect(response.stats.length).toBeGreaterThan(0)
      expect(response.rows[0]?.key).toBe("member-profile")
    }
  })

  test("rejects member sections when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.member.section({ section: "commitments" })
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("validates member section names", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.section({ section: "receipts" } as never)
    ).rejects.toThrow()
  })

  test("returns member financing for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const financing = await caller.mobile.member.financing.list()

    expect(financing.state).toBe("database_unavailable")
    expect(financing.member).toBeNull()
    expect(financing.products).toEqual([])
    expect(financing.requests).toEqual([])
    expect(financing.section.key).toBe("financing")
  })

  test("rejects member financing when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.financing.list()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("validates member financing request create input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.financing.createRequest({
        loanProductId: "",
        requestedAmount: 1000,
        requestedTermMonths: 3,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.financing.createRequest({
        loanProductId: "loan-product-1",
        requestedAmount: 0,
        requestedTermMonths: 3,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.financing.createRequest({
        loanProductId: "loan-product-1",
        requestedAmount: 1000,
        requestedTermMonths: 0,
      })
    ).rejects.toThrow()
  })

  test("rejects member financing request create without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.financing.createRequest({
        extraMonthlySavingsAmount: 100,
        loanProductId: "loan-product-1",
        purpose: "Emergency cooperative financing",
        requestedAmount: 1000,
        requestedTermMonths: 3,
      })
    ).rejects.toThrow("Financing requests are unavailable")
  })

  test("returns member procurement for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const procurement = await caller.mobile.member.procurement.list()

    expect(procurement.canCreateRequest).toBe(false)
    expect(procurement.member).toBeNull()
    expect(procurement.requests).toEqual([])
    expect(procurement.summary.pendingRequests).toBe(0)
    expect(procurement.summary.outstandingAmount).toBe(0)
  })

  test("rejects member procurement when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.procurement.list()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("validates member procurement request create input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.procurement.createRequest({
        itemName: "",
        requestedCost: 1000,
        requestedRepaymentMonths: 3,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.procurement.createRequest({
        itemName: "Rice bags",
        requestedCost: 0,
        requestedRepaymentMonths: 3,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.procurement.createRequest({
        itemName: "Rice bags",
        requestedCost: 1000,
        requestedRepaymentMonths: 0,
      })
    ).rejects.toThrow()
  })

  test("rejects member procurement request create without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.procurement.createRequest({
        itemDescription: "Household supply request",
        itemName: "Rice bags",
        requestedCost: 1000,
        requestedRepaymentMonths: 3,
        vendorName: "Market vendor",
      })
    ).rejects.toThrow("Procurement requests are unavailable")
  })

  test("returns member project financing for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const projectFinancing = await caller.mobile.member.projectFinancing.list()

    expect(projectFinancing.member).toBeNull()
    expect(projectFinancing.requests).toEqual([])
    expect(projectFinancing.summary.pendingRequests).toBe(0)
    expect(projectFinancing.summary.outstandingAmount).toBe(0)
  })

  test("rejects member project financing when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.projectFinancing.list()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("validates member project financing request create input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.projectFinancing.createRequest({
        businessName: "",
        requestedAmount: 1000,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.projectFinancing.createRequest({
        businessName: "Market kiosk",
        requestedAmount: 0,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.projectFinancing.createRequest({
        businessName: "Market kiosk",
        proposedStructure: "unsupported" as never,
        requestedAmount: 1000,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.projectFinancing.createRequest({
        businessName: "Market kiosk",
        requestedAmount: 1000,
        requestedPaybackMonths: 0,
      })
    ).rejects.toThrow()
  })

  test("rejects member project financing request create without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.projectFinancing.createRequest({
        businessDescription: "Community food supply expansion.",
        businessName: "Market kiosk",
        projectPurpose: "Restock inventory",
        proposedStructure: "repayable_facility",
        requestedAmount: 1000,
        requestedPaybackMonths: 3,
      })
    ).rejects.toThrow("Project financing requests are unavailable")
  })

  test("returns member food purchase for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const foodPurchase = await caller.mobile.member.foodPurchase.list()

    expect(foodPurchase.member).toBeNull()
    expect(foodPurchase.canCreateApplication).toBe(false)
    expect(foodPurchase.cycles).toEqual([])
    expect(foodPurchase.applications).toEqual([])
    expect(foodPurchase.summary.openCycles).toBe(0)
    expect(foodPurchase.summary.pendingApplications).toBe(0)
  })

  test("rejects member food purchase when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.foodPurchase.list()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("validates member food purchase application create input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.foodPurchase.createApplication({
        cycleId: "",
        requestedAmount: 1000,
        requestedPaybackMonths: 1,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.foodPurchase.createApplication({
        cycleId: "food-cycle-1",
        requestedAmount: 0,
        requestedPaybackMonths: 1,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.foodPurchase.createApplication({
        cycleId: "food-cycle-1",
        requestedAmount: 1000,
        requestedPaybackMonths: 0,
      })
    ).rejects.toThrow()
  })

  test("rejects member food purchase application create without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.foodPurchase.createApplication({
        cycleId: "food-cycle-1",
        itemDescription: "Monthly staple foods",
        requestedAmount: 1000,
        requestedPaybackMonths: 1,
        requestNotes: "Needed for household supplies.",
      })
    ).rejects.toThrow("Foodstuff Purchase applications are unavailable")
  })

  test("returns member guarantor approvals for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const approvals = await caller.mobile.member.guarantorApprovals.list()

    expect(approvals.member).toBeNull()
    expect(approvals.approvals).toEqual([])
    expect(approvals.summary.pendingApprovals).toBe(0)
  })

  test("rejects member guarantor approvals when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.member.guarantorApprovals.list()
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("validates member guarantor approval response input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.guarantorApprovals.respond({
        guarantorApprovalId: "",
        status: "approved",
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.guarantorApprovals.respond({
        guarantorApprovalId: "approval-1",
        status: "pending" as never,
      })
    ).rejects.toThrow()
  })

  test("rejects member guarantor approval response without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.guarantorApprovals.respond({
        guarantorApprovalId: "approval-1",
        notes: "I consent to this request.",
        status: "approved",
      })
    ).rejects.toThrow("Guarantor approvals are unavailable")
  })

  test("returns member shares for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const shares = await caller.mobile.member.shares.list()

    expect(shares.state).toBe("database_unavailable")
    expect(shares.member).toBeNull()
    expect(shares.applications).toEqual([])
    expect(shares.section.key).toBe("shares")
  })

  test("rejects member shares when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.shares.list()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("validates member share application create input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.shares.createApplication({
        requestedUnits: 0,
      })
    ).rejects.toThrow()
  })

  test("rejects member share application create without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.shares.createApplication({
        notes: "I want to increase my ownership position.",
        requestedUnits: 1,
      })
    ).rejects.toThrow("Share requests are unavailable")
  })

  test("returns member receipts for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const receipts = await caller.mobile.member.receipts.list()

    expect(receipts.member).toBeNull()
    expect(receipts.receipts).toEqual([])
    expect(receipts.summary.pendingReviewReceipts).toBe(0)
  })

  test("rejects member receipts when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.receipts.list()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("validates member receipt create input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.receipts.create({
        allocations: [
          {
            amount: 1000,
            category: "unsupported" as never,
          },
        ],
        paidAt: new Date().toISOString(),
        totalAmount: 1000,
      })
    ).rejects.toThrow()
  })

  test("rejects member receipt create without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.receipts.create({
        allocations: [
          {
            amount: 1000,
            category: "commitment",
            periodIntent: "current_period",
          },
        ],
        paidAt: new Date().toISOString(),
        paymentReference: "MOBILE-TEST-1",
        totalAmount: 1000,
      })
    ).rejects.toThrow("Receipts are unavailable")
  })

  test("returns member support list for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const support = await caller.mobile.member.support.list()

    expect(support.member).toBeNull()
    expect(support.cases).toEqual([])
    expect(support.summary.openCases).toBe(0)
  })

  test("rejects member support list when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.support.list()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("validates member support create input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.support.create({
        category: "unknown" as never,
        description: "Need help with this account issue.",
        subject: "Help",
      })
    ).rejects.toThrow()
  })

  test("validates member support create linked receipt input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.support.create({
        category: "payment_issue",
        description: "Need help with this receipt allocation.",
        linkedRecordId: "receipt-1",
        subject: "Receipt help",
      })
    ).rejects.toThrow()
  })

  test("rejects member support create without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.support.create({
        category: "technical",
        description: "Need help with this account issue.",
        subject: "Help needed",
      })
    ).rejects.toThrow("Support is unavailable")
  })

  test("validates member support reply input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.support.reply({
        message: "",
        supportCaseId: "support-case-1",
      })
    ).rejects.toThrow()
  })

  test("rejects member support reply when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.member.support.reply({
        message: "Please review this support case.",
        supportCaseId: "support-case-1",
      })
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("rejects member support reply without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.support.reply({
        message: "Please review this support case.",
        supportCaseId: "support-case-1",
      })
    ).rejects.toThrow("Support is unavailable")
  })

  test("returns admin member directory for staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    const members = await caller.mobile.admin.members.list({
      pageSize: 10,
      status: "active",
    })

    expect(members.members).toEqual([])
    expect(members.onboardingRequests).toEqual([])
    expect(members.page).toBe(1)
    expect(members.pageSize).toBe(10)
    expect(members.reviewQueues).toEqual([])
    expect(members.summary.totalCount).toBe(0)
  })

  test("returns admin member detail for staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    const detail = await caller.mobile.admin.members.detail({
      memberId: "member-amanah-missing",
    })

    expect(detail.generatedAt).toEqual(expect.any(String))
    expect(detail.member).toBeNull()
    expect(detail.sections[0]?.key).toBe("profile")
    expect(detail.stats).toHaveLength(4)
  })

  test("rejects admin member directory from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(caller.mobile.admin.members.list()).rejects.toThrow(
      "This action requires operations_officer role or above."
    )
  })

  test("rejects admin member detail from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.admin.members.detail({
        memberId: "member-amanah-missing",
      })
    ).rejects.toThrow("This action requires operations_officer role or above.")
  })

  test("validates admin member detail input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.members.detail({
        memberId: "",
      })
    ).rejects.toThrow()
  })

  test("validates admin member directory filters", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.members.list({
        page: 0,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.admin.members.list({
        pageSize: 100,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.admin.members.list({
        kycStatus: "unknown" as never,
      })
    ).rejects.toThrow()
  })

  test("validates admin member creation input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.members.create({
        fullName: "",
        joinedAt: new Date().toISOString(),
        memberNumber: "M-001",
        memberType: "individual",
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.admin.members.create({
        fullName: "Aisha Bello",
        joinedAt: "not-a-date",
        memberNumber: "M-001",
        memberType: "individual",
      })
    ).rejects.toThrow()
  })

  test("routes admin member creation through the database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.members.create({
        fullName: "Aisha Bello",
        joinedAt: new Date().toISOString(),
        memberNumber: "M-001",
        memberType: "individual",
      })
    ).rejects.toThrow("Member creation is unavailable")
  })

  test("routes admin member review mutations through the database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.members.updateStatus({
        memberId: "member-1",
        reviewNotes: "Approved from mobile onboarding queue.",
        status: "active",
      })
    ).rejects.toThrow("Member status review is unavailable")

    await expect(
      caller.mobile.admin.members.updateKyc({
        kycReviewNotes: "Verified from mobile.",
        kycStatus: "verified",
        memberId: "member-1",
      })
    ).rejects.toThrow("Member KYC review is unavailable")

    await expect(
      caller.mobile.admin.members.reviewOnboarding({
        decision: "approved",
        requestId: "onboarding-1",
        reviewNotes: "Approved from mobile onboarding queue.",
      })
    ).rejects.toThrow("Member onboarding review is unavailable")
  })

  test("returns admin finance overview for staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    const finance = await caller.mobile.admin.finance.overview()

    expect(finance.collectionFollowUps).toEqual([])
    expect(finance.generatedAt).toEqual(expect.any(String))
    expect(finance.recentItems).toEqual([])
    expect(finance.stats.map((stat) => stat.key)).toEqual(["finance-queues"])
  })

  test("rejects admin finance overview from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(caller.mobile.admin.finance.overview()).rejects.toThrow(
      "This action requires operations_officer role or above."
    )
  })

  test("validates admin finance review inputs", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.finance.reviewReceipt({
        decision: "approved",
        receiptId: "",
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.admin.finance.recordCollectionFollowUp({
        note: "",
        repaymentScheduleItemId: "schedule-1",
        status: "reminded",
      })
    ).rejects.toThrow()
  })

  test("rejects admin finance review mutations from member workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.admin.finance.reviewFinancingRequest({
        loanRequestId: "loan-request-1",
        status: "under_review",
      })
    ).rejects.toThrow("This action requires finance_officer role or above.")
  })

  test("routes admin finance review mutations through the database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.finance.reviewReceipt({
        decision: "under_review",
        receiptId: "receipt-1",
      })
    ).rejects.toThrow("Receipt review is unavailable")

    await expect(
      caller.mobile.admin.finance.reviewFinancingRequest({
        loanRequestId: "loan-request-1",
        status: "under_review",
      })
    ).rejects.toThrow("Financing request review is unavailable")

    await expect(
      caller.mobile.admin.finance.reviewProcurementRequest({
        procurementRequestId: "procurement-1",
        status: "under_review",
      })
    ).rejects.toThrow("Procurement request review is unavailable")

    await expect(
      caller.mobile.admin.finance.reviewFoodPurchaseApplication({
        applicationId: "food-application-1",
        status: "under_review",
      })
    ).rejects.toThrow("Foodstuff Purchase review is unavailable")

    await expect(
      caller.mobile.admin.finance.reviewProjectFinancingRequest({
        projectFinancingRequestId: "project-1",
        status: "under_review",
      })
    ).rejects.toThrow("Project financing review is unavailable")

    await expect(
      caller.mobile.admin.finance.recordCollectionFollowUp({
        note: "Called member and agreed next action.",
        repaymentScheduleItemId: "schedule-1",
        status: "reminded",
      })
    ).rejects.toThrow("Collection follow-up is unavailable")
  })

  test("returns admin reports overview for staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    const reports = await caller.mobile.admin.reports.overview()

    expect(reports.activityEvents).toEqual([])
    expect(reports.collectionFollowUps).toEqual([])
    expect(reports.generatedAt).toEqual(expect.any(String))
    expect(reports.reports.map((report) => report.key)).toContain("members")
    expect(reports.reports.map((report) => report.exportHref)).toContain(
      "/reports/members-export"
    )
    expect(reports.stats.map((stat) => stat.key)).toEqual(["report-count"])
  })

  test("rejects admin reports overview from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(caller.mobile.admin.reports.overview()).rejects.toThrow(
      "This action requires operations_officer role or above."
    )
  })

  test("returns admin access overview for tenant admin workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    const access = await caller.mobile.admin.access.overview()

    expect(access.generatedAt).toEqual(expect.any(String))
    expect(access.summary.workspaceUsers).toBe(2)
    expect(access.summary.roleAssignments).toBe(3)
    expect(access.summary.defaultRoles).toBe(2)
    expect(access.users.map((user) => user.email)).toContain(
      "admin@amanah.local"
    )
    expect(access.roles.map((role) => role.role)).toContain("tenant_admin")
  })

  test("rejects admin access overview from non-admin staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-barakah-finance",
      tenantId: "tenant-barakah-demo",
      userId: "user-finance-barakah",
    })

    await expect(caller.mobile.admin.access.overview()).rejects.toThrow(
      "This action requires tenant_admin role or above."
    )
  })

  test("rejects admin access overview from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(caller.mobile.admin.access.overview()).rejects.toThrow(
      "This action requires tenant_admin role or above."
    )
  })

  test("routes admin access invites through the database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.access.invite({
        email: "new.ops@example.com",
        fullName: "New Operations Officer",
        role: "operations_officer",
      })
    ).rejects.toThrow("Workspace invitation is unavailable")
  })

  test("rejects admin access invites from non-admin staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-barakah-finance",
      tenantId: "tenant-barakah-demo",
      userId: "user-finance-barakah",
    })

    await expect(
      caller.mobile.admin.access.invite({
        email: "new.ops@example.com",
        fullName: "New Operations Officer",
        role: "operations_officer",
      })
    ).rejects.toThrow("This action requires tenant_admin role or above.")
  })

  test("rejects super admin mobile invitations", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.access.invite({
        email: "new.super@example.com",
        fullName: "New Super Admin",
        role: "super_admin" as never,
      })
    ).rejects.toThrow()
  })

  test("routes admin share review through the database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.access.reviewShareApplication({
        applicationId: "share-application-1",
        decision: "rejected",
      })
    ).rejects.toThrow("Share application review is unavailable")
  })

  test("routes admin support mutations through the database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.support.reply({
        message: "We are reviewing this.",
        supportCaseId: "support-1",
      })
    ).rejects.toThrow("Support reply is unavailable")

    await expect(
      caller.mobile.admin.support.updateStatus({
        status: "in_progress",
        supportCaseId: "support-1",
      })
    ).rejects.toThrow("Support status update is unavailable")
  })

  test("returns mobile notifications for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const notifications = await caller.mobile.notifications.overview()

    expect(notifications.deliveries).toEqual([])
    expect(notifications.generatedAt).toEqual(expect.any(String))
    expect(notifications.preferences).toEqual([])
    expect(notifications.summary).toEqual({
      enabledPreferences: 0,
      failed: 0,
      queued: 0,
      sent: 0,
      totalDeliveries: 0,
    })
  })

  test("returns mobile notifications for staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    const notifications = await caller.mobile.notifications.overview()

    expect(notifications.deliveries).toEqual([])
    expect(notifications.generatedAt).toEqual(expect.any(String))
    expect(notifications.summary.totalDeliveries).toBe(0)
  })

  test("routes mobile device registration through the database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.notifications.registerDevice({
        appVersion: "0.1.0",
        buildVariant: "development",
        deviceId: "mobile-test-device",
        platform: "ios",
        revocationState: "active",
      })
    ).rejects.toThrow("Mobile device registration is unavailable")
  })

  test("validates mobile device registration input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.notifications.registerDevice({
        appVersion: "0.1.0",
        buildVariant: "development",
        deviceId: "x",
        platform: "ios",
        revocationState: "active",
      })
    ).rejects.toThrow()
  })

  test("returns admin overview for staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    const overview = await caller.mobile.admin.overview()

    expect(overview.stats.map((stat) => stat.key)).toEqual([
      "deployable-funds",
      "collection-coverage",
      "action-queue",
    ])
    expect(overview.generatedAt).toEqual(expect.any(String))
    expect(overview.supportCases).toEqual([])
    expect(overview.warnings).toEqual([])
  })

  test("rejects admin overview from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(caller.mobile.admin.overview()).rejects.toThrow(
      "This action requires operations_officer role or above."
    )
  })
})
