import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

describe("mobileRouter", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const createCaller = createCallerFactory(appRouter)

  beforeAll(() => {
    delete process.env.DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl
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

  test("returns member food purchase for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const foodPurchase = await caller.mobile.member.foodPurchase.list()

    expect(foodPurchase.member).toBeNull()
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
