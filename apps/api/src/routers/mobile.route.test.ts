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

  test("returns dedicated member commitments for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const commitments = await caller.mobile.member.commitments()

    expect(commitments.key).toBe("commitments")
    expect(commitments.generatedAt).toEqual(expect.any(String))
    expect(commitments.stats.map((stat) => stat.key)).toEqual([
      "active-commitment",
      "savings",
      "special-savings",
      "contributions",
    ])
    expect(commitments.rows[0]?.key).toBe("member-profile")
  })

  test("rejects dedicated member commitments from a staff workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.commitments()).rejects.toThrow(
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

  test("keeps member statement export self-scoped and rejects staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.member.statementExport({
        requestId: "00000000-0000-4000-8000-000000000927",
      })
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("fails member statement export closed when entitlements are unavailable", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.statementExport({
        requestId: "00000000-0000-4000-8000-000000000928",
      })
    ).rejects.toThrow("You do not have permission")
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

  test("returns bounded member activity without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    for (const kind of ["commitments", "shares", "statement"] as const) {
      const page = await caller.mobile.member.activity({ kind, limit: 20 })

      expect(page).toMatchObject({
        items: [],
        kind,
        nextCursor: null,
        state: "database_unavailable",
      })
    }
  })

  test("rejects member activity from a staff workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.member.activity({ kind: "statement" })
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("validates member activity kind, cursor, and page size", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.activity({ kind: "receipts" } as never)
    ).rejects.toThrow()
    await expect(
      caller.mobile.member.activity({ kind: "statement", limit: 51 })
    ).rejects.toThrow()
    await expect(
      caller.mobile.member.activity({ cursor: "", kind: "statement" })
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

  test("validates member financing quote input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.financing.quote({
        loanProductId: "",
        requestedAmount: 1000,
        requestedTermMonths: 3,
      })
    ).rejects.toThrow()
    await expect(
      caller.mobile.member.financing.quote({
        loanProductId: "loan-product-1",
        requestedAmount: 0,
        requestedTermMonths: 3,
      })
    ).rejects.toThrow()
    await expect(
      caller.mobile.member.financing.quote({
        loanProductId: "loan-product-1",
        requestedAmount: 1000,
        requestedTermMonths: 0,
      })
    ).rejects.toThrow()
  })

  test("rejects member financing quote without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.financing.quote({
        extraMonthlySavingsAmount: 100,
        loanProductId: "loan-product-1",
        requestedAmount: 1000,
        requestedTermMonths: 3,
      })
    ).rejects.toThrow()
  })

  test("rejects member financing quote when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.member.financing.quote({
        loanProductId: "loan-product-1",
        requestedAmount: 1000,
        requestedTermMonths: 3,
      })
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("returns a bounded financing request page without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.financing.requests({ pageSize: 20 })
    ).resolves.toEqual({
      data: [],
      nextCursor: null,
      state: "database_unavailable",
    })
  })

  test("validates member financing request page input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.financing.requests({ cursor: "" })
    ).rejects.toThrow()
    await expect(
      caller.mobile.member.financing.requests({ pageSize: 51 })
    ).rejects.toThrow()
  })

  test("rejects member financing request pages from a staff workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.member.financing.requests({ pageSize: 20 })
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("validates and role-scopes member financing request details", async () => {
    const memberCaller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })
    const staffCaller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      memberCaller.mobile.member.financing.request({ loanRequestId: "" })
    ).rejects.toThrow()
    await expect(
      staffCaller.mobile.member.financing.request({
        loanRequestId: "loan-request-1",
      })
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("validates member financing request create input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })
    const chargeQuoteHash = "a".repeat(64)

    await expect(
      caller.mobile.member.financing.createRequest({
        chargeQuoteHash,
        loanProductId: "",
        requestedAmount: 1000,
        requestedTermMonths: 3,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.financing.createRequest({
        chargeQuoteHash,
        loanProductId: "loan-product-1",
        requestedAmount: 0,
        requestedTermMonths: 3,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.financing.createRequest({
        chargeQuoteHash,
        loanProductId: "loan-product-1",
        requestedAmount: 1000,
        requestedTermMonths: 0,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.financing.createRequest({
        chargeQuoteHash: "invalid",
        loanProductId: "loan-product-1",
        requestedAmount: 1000,
        requestedTermMonths: 3,
      })
    ).rejects.toThrow()
  })

  test("rejects member financing request create without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.financing.createRequest({
        chargeQuoteHash: "a".repeat(64),
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
        submissionKey: "00000000-0000-4000-8000-000000000101",
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

  test("validates and member-scopes project financing charge quotes", async () => {
    const memberCaller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })
    const staffCaller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      memberCaller.mobile.member.projectFinancing.quote({ requestedAmount: 0 })
    ).rejects.toThrow()
    await expect(
      staffCaller.mobile.member.projectFinancing.quote({
        requestedAmount: 1000,
      })
    ).rejects.toThrow("Switch to the member workspace")
    await expect(
      memberCaller.mobile.member.projectFinancing.quote({
        requestedAmount: 1000,
      })
    ).rejects.toThrow("Project financing is unavailable")
  })

  test("validates member project financing request create input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.projectFinancing.createRequest({
        businessName: "Market kiosk",
        requestedAmount: 1000,
        submissionKey: "00000000-0000-4000-8000-000000000105",
      })
    ).rejects.toThrow("Review the information provided")

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

    await expect(
      caller.mobile.member.projectFinancing.createRequest({
        businessName: "Market kiosk",
        proposedStructure: "repayable_facility",
        requestedAmount: 1000,
        submissionKey: "00000000-0000-4000-8000-000000000102",
      })
    ).rejects.toThrow("Review the information provided")

    await expect(
      caller.mobile.member.projectFinancing.createRequest({
        businessName: "Market kiosk",
        proposedStructure: "profit_sharing",
        requestedAmount: 1000,
        requestedPaybackMonths: 3,
        submissionKey: "00000000-0000-4000-8000-000000000103",
      })
    ).rejects.toThrow("Review the information provided")
  })

  test("rejects member project financing request create without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.projectFinancing.createRequest({
        businessDescription: "Community food supply expansion.",
        businessName: "Market kiosk",
        chargeQuoteHash: "a".repeat(64),
        projectPurpose: "Restock inventory",
        proposedStructure: "repayable_facility",
        requestedAmount: 1000,
        requestedPaybackMonths: 3,
        submissionKey: "00000000-0000-4000-8000-000000000104",
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
        submissionKey: "00000000-0000-4000-8000-000000000105",
      })
    ).rejects.toThrow("Foodstuff Purchase applications are unavailable")
  })

  test("returns bounded cooperative-service history pages and scoped details", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const [procurement, foodPurchase, projectFinancing] = await Promise.all([
      caller.mobile.member.procurement.requests({ pageSize: 20 }),
      caller.mobile.member.foodPurchase.applications({ pageSize: 20 }),
      caller.mobile.member.projectFinancing.requests({ pageSize: 20 }),
    ])

    for (const page of [procurement, foodPurchase, projectFinancing]) {
      expect(page.state).toBe("database_unavailable")
      expect(page.data).toEqual([])
      expect(page.nextCursor).toBeNull()
    }

    await expect(
      caller.mobile.member.procurement.request({
        procurementRequestId: "00000000-0000-4000-8000-000000000201",
      })
    ).resolves.toBeNull()
    await expect(
      caller.mobile.member.foodPurchase.application({
        foodPurchaseApplicationId: "00000000-0000-4000-8000-000000000202",
      })
    ).resolves.toBeNull()
    await expect(
      caller.mobile.member.projectFinancing.request({
        projectFinancingRequestId: "00000000-0000-4000-8000-000000000203",
      })
    ).resolves.toBeNull()
  })

  test("rejects invalid and staff cooperative-service history access", async () => {
    const memberCaller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })
    const staffCaller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      memberCaller.mobile.member.procurement.requests({ pageSize: 51 })
    ).rejects.toThrow()
    await expect(
      memberCaller.mobile.member.foodPurchase.applications({ cursor: "" })
    ).rejects.toThrow()
    await expect(
      memberCaller.mobile.member.projectFinancing.request({
        projectFinancingRequestId: "not-a-uuid",
      })
    ).rejects.toThrow()

    await expect(
      staffCaller.mobile.member.procurement.requests({ pageSize: 20 })
    ).rejects.toThrow("Switch to the member workspace")
    await expect(
      staffCaller.mobile.member.foodPurchase.applications({ pageSize: 20 })
    ).rejects.toThrow("Switch to the member workspace")
    await expect(
      staffCaller.mobile.member.projectFinancing.requests({ pageSize: 20 })
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("returns member guarantor approvals for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const approvals = await caller.mobile.member.guarantorApprovals.list()

    expect(approvals.state).toBe("database_unavailable")
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
        decisionConfirmed: true,
        guarantorApprovalId: "",
        status: "approved",
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.guarantorApprovals.respond({
        decisionConfirmed: true,
        guarantorApprovalId: "approval-1",
        status: "pending" as never,
      })
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.guarantorApprovals.respond({
        guarantorApprovalId: "approval-1",
        status: "approved",
      } as never)
    ).rejects.toThrow()

    await expect(
      caller.mobile.member.guarantorApprovals.respond({
        decisionConfirmed: true,
        guarantorApprovalId: "approval-1",
        status: "rejected",
      })
    ).rejects.toThrow()
  })

  test("rejects member guarantor approval response without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.guarantorApprovals.respond({
        decisionConfirmed: true,
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
    expect(shares.applicationNextCursor).toBeNull()
    expect(shares.applicationTotal).toBe(0)
    expect(shares.section.key).toBe("shares")
  })

  test("returns a bounded member share application page", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const page = await caller.mobile.member.shares.applications({
      cursor: null,
      pageSize: 20,
    })

    expect(page).toEqual({
      data: [],
      nextCursor: null,
      state: "database_unavailable",
      total: 0,
    })
  })

  test("rejects member share application pages from staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.member.shares.applications({ pageSize: 20 })
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("validates member share application page inputs", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.shares.applications({ pageSize: 51 })
    ).rejects.toThrow()
    await expect(
      caller.mobile.member.shares.applications({ cursor: "" })
    ).rejects.toThrow()
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

    expect(receipts.canCreateReceipt).toBe(false)
    expect(receipts.canCreateSupportCase).toBe(false)
    expect(receipts.categories).toEqual([])
    expect(receipts.member).toBeNull()
    expect(receipts.nextCursor).toBeNull()
    expect(receipts.receipts).toEqual([])
    expect(receipts.state).toBe("database_unavailable")
    expect(receipts.summary.pendingReviewReceipts).toBe(0)
  })

  test("validates member receipt pagination input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.receipts.list({ cursor: "" })
    ).rejects.toThrow()
  })

  test("rejects member receipts when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.receipts.list()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("validates and role-scopes member receipt details", async () => {
    const memberCaller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })
    const staffCaller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      memberCaller.mobile.member.receipts.detail({ receiptId: "" })
    ).rejects.toThrow()
    await expect(
      staffCaller.mobile.member.receipts.detail({ receiptId: "receipt-1" })
    ).rejects.toThrow("Switch to the member workspace")
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

    expect(support.canCreateCase).toBe(false)
    expect(support.member).toBeNull()
    expect(support.nextCursor).toBeNull()
    expect(support.cases).toEqual([])
    expect(support.state).toBe("database_unavailable")
    expect(support.summary.openCases).toBe(0)
  })

  test("validates member support pagination input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.support.list({ cursor: "" })
    ).rejects.toThrow()
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

  test("validates member support detail input", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.support.detail({ supportCaseId: "" })
    ).rejects.toThrow()
  })

  test("rejects member support detail when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.member.support.detail({
        supportCaseId: "support-case-1",
      })
    ).rejects.toThrow("Switch to the member workspace")
  })

  test("rejects member support detail without a database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.member.support.detail({
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
      "You do not have permission to perform this action."
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
    ).rejects.toThrow("You do not have permission to perform this action.")
  })

  test("rejects admin member lifecycle access from finance-only staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-barakah-finance",
      tenantId: "tenant-barakah-demo",
      userId: "user-finance-barakah",
    })

    await expect(caller.mobile.admin.members.list()).rejects.toThrow(
      "You do not have permission to perform this action."
    )
    await expect(
      caller.mobile.admin.members.updateKyc({
        kycReviewNotes: "Finance staff must not review member KYC.",
        kycStatus: "verified",
        memberId: "member-1",
      })
    ).rejects.toThrow("You do not have permission to perform this action.")
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

    expect(finance.items).toEqual([])
    expect(finance.generatedAt).toEqual(expect.any(String))
    expect(finance.state).toBe("database_unavailable")
    expect(finance.stats.map((stat) => stat.key)).toEqual(["visible-work"])
  })

  test("rejects admin finance overview from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(caller.mobile.admin.finance.overview()).rejects.toThrow(
      "You do not have permission"
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
        commandId: "00000000-0000-4000-8000-000000000901",
        expectedState: "submitted",
        loanRequestId: "loan-request-1",
        status: "under_review",
      })
    ).rejects.toThrow("You do not have permission")
  })

  test("routes admin finance review mutations through the database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.finance.reviewReceipt({
        commandId: "00000000-0000-4000-8000-000000000902",
        decision: "under_review",
        expectedState: "submitted",
        receiptId: "receipt-1",
      })
    ).rejects.toThrow("Something went wrong. Please try again.")

    await expect(
      caller.mobile.admin.finance.reviewFinancingRequest({
        commandId: "00000000-0000-4000-8000-000000000903",
        expectedState: "submitted",
        loanRequestId: "loan-request-1",
        status: "under_review",
      })
    ).rejects.toThrow("Something went wrong. Please try again.")

    await expect(
      caller.mobile.admin.finance.reviewProcurementRequest({
        commandId: "00000000-0000-4000-8000-000000000904",
        expectedState: "submitted",
        procurementRequestId: "procurement-1",
        status: "under_review",
      })
    ).rejects.toThrow("Something went wrong. Please try again.")

    await expect(
      caller.mobile.admin.finance.reviewFoodPurchaseApplication({
        applicationId: "food-application-1",
        commandId: "00000000-0000-4000-8000-000000000905",
        expectedState: "submitted",
        status: "under_review",
      })
    ).rejects.toThrow("Something went wrong. Please try again.")

    await expect(
      caller.mobile.admin.finance.reviewProjectFinancingRequest({
        commandId: "00000000-0000-4000-8000-000000000906",
        expectedState: "submitted",
        projectFinancingRequestId: "project-1",
        status: "under_review",
      })
    ).rejects.toThrow("Something went wrong. Please try again.")

    await expect(
      caller.mobile.admin.finance.recordCollectionFollowUp({
        commandId: "00000000-0000-4000-8000-000000000907",
        expectedState: "overdue",
        note: "Called member and agreed next action.",
        repaymentScheduleItemId: "schedule-1",
        status: "reminded",
      })
    ).rejects.toThrow("Something went wrong. Please try again.")
  })

  test("returns admin reports overview for staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    const reports = await caller.mobile.admin.reports.overview()

    expect(reports.activityEvents).toEqual([])
    expect(reports.collectionFollowUps).toEqual([])
    expect(reports.generatedAt).toEqual(expect.any(String))
    expect(reports.reports).toEqual([])
    expect(reports.stats.map((stat) => stat.key)).toEqual(["report-count"])
  })

  test("rejects admin reports overview from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(caller.mobile.admin.reports.overview()).rejects.toThrow(
      "You do not have permission"
    )
  })

  test("rejects report generation and activity from member workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.admin.reports.activity({ limit: 25 })
    ).rejects.toThrow("You do not have permission")
    await expect(
      caller.mobile.admin.reports.generate({
        key: "members",
        requestId: "00000000-0000-4000-8000-000000000929",
      })
    ).rejects.toThrow("You do not have permission")
  })

  test("fails audit export closed when report entitlements are unavailable", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.reports.generate({
        key: "audit",
        requestId: "00000000-0000-4000-8000-000000000930",
      })
    ).rejects.toThrow("You do not have permission")
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
      "You do not have permission"
    )
  })

  test("rejects admin access overview from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(caller.mobile.admin.access.overview()).rejects.toThrow(
      "You do not have permission"
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
    ).rejects.toThrow("You do not have permission")
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
      caller.mobile.admin.finance.reviewShareApplication({
        applicationId: "share-application-1",
        commandId: "00000000-0000-4000-8000-000000000908",
        decision: "rejected",
        expectedState: "pending",
        reviewNotes: "Rejected after reviewing member capacity.",
      })
    ).rejects.toThrow("Something went wrong. Please try again.")
  })

  test("routes admin support mutations through the database runtime", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(
      caller.mobile.admin.support.reply({
        commandId: "00000000-0000-4000-8000-000000000909",
        expectedState: "open",
        message: "We are reviewing this.",
        supportCaseId: "support-1",
      })
    ).rejects.toThrow("Something went wrong. Please try again.")

    await expect(
      caller.mobile.admin.support.updateStatus({
        commandId: "00000000-0000-4000-8000-000000000910",
        expectedState: "open",
        resolutionSummary: "Reviewing the member evidence.",
        status: "in_progress",
        supportCaseId: "support-1",
      })
    ).rejects.toThrow("Something went wrong. Please try again.")
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
      unread: 0,
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

  test("validates notification read synchronization and keeps database errors redacted", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(
      caller.mobile.notifications.markRead({ deliveryIds: [] })
    ).rejects.toThrow()
    await expect(
      caller.mobile.notifications.markRead({
        deliveryIds: ["00000000-0000-4000-8000-000000000911"],
      })
    ).rejects.toThrow("Something went wrong. Please try again.")
  })

  test("keeps device-session rotation outside the notification boundary", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    expect(caller.mobile.notifications).not.toHaveProperty("registerDevice")
    await expect(caller.mobile.sessions.list()).rejects.toThrow()
  })

  test("returns admin overview for staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    const overview = await caller.mobile.admin.overview()

    expect(overview.stats.map((stat) => stat.key)).toEqual([
      "deployable-funds",
      "collection-coverage",
      "portfolio-risk",
    ])
    expect(overview.generatedAt).toEqual(expect.any(String))
    expect(overview.complianceWatch).toEqual([])
    expect(overview.recentActivity).toEqual([])
    expect(overview.warnings).toEqual([])
  })

  test("rejects admin overview from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(caller.mobile.admin.overview()).rejects.toThrow(
      "You do not have permission to perform this action."
    )
  })
})
