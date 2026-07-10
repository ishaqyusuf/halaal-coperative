import { describe, expect, test } from "bun:test"
import {
  createFoodPurchaseCycle,
  recordFoodPurchaseAccounting,
  reviewFoodPurchaseAccounting,
  reviewFoodPurchaseApplication,
  submitFoodPurchaseApplication,
} from "./food-purchase"

function createFoodPurchasePrismaStub(input?: {
  actorBelongsToTenant?: boolean
  approvedApplicationTotal?: number
  canUseLiveWrites?: boolean
  cycleStatus?: string
  existingCycle?: boolean
  foodPurchaseAllowsCommitmentReductionDuringPayback?: boolean
  foodPurchaseMaximumPaybackMonths?: number
  memberBelongsToTenant?: boolean
}) {
  const auditLogCreates: unknown[] = []
  const foodPurchaseApplicationCreates: unknown[] = []
  const foodPurchaseApplicationUpdates: unknown[] = []
  const foodPurchaseCycleCreates: unknown[] = []
  const foodPurchaseCycleUpdates: unknown[] = []
  const canUseLiveWrites = input?.canUseLiveWrites ?? true
  const staffUser = {
    email: "committee@example.com",
    fullName: "Committee Staff",
    id: "user-1",
  }
  const reviewerUser = {
    email: "reviewer@example.com",
    fullName: "Reviewer",
    id: "reviewer-1",
  }
  const member = {
    email: "aisha@example.com",
    fullName: "Aisha Member",
    id: "member-1",
    memberNumber: "M-001",
  }
  const tenant = {
    id: "tenant-1",
    initialMigrationStatus: canUseLiveWrites
      ? "live_operations"
      : "historical_setup_in_progress",
    migrationEmergencyUnlockUntil: null,
    migrationFinalizedAt: canUseLiveWrites
      ? new Date("2026-01-31T00:00:00.000Z")
      : null,
    startDate: new Date("2025-01-01T00:00:00.000Z"),
  }
  const existingCycle = {
    accountingNotes: null,
    accountingSubmittedAt: null,
    accountingSubmittedByUser: null,
    accountingSubmittedByUserId: null,
    createdAt: new Date("2026-07-09T00:00:00.000Z"),
    id: "cycle-1",
    operatingExpenseAmount: null,
    periodMonth: new Date("2026-07-01T00:00:00.000Z"),
    profitAmount: null,
    purchaseCostAmount: null,
    releasedAmount: 500000,
    releasedAt: new Date("2026-06-30T17:00:00.000Z"),
    releasedByUser: staffUser,
    releasedByUserId: staffUser.id,
    releaseNotes: "Released to food committee.",
    salesAmount: null,
    status: input?.cycleStatus ?? "open",
    tenantId: "tenant-1",
    updatedAt: new Date("2026-07-09T00:00:00.000Z"),
  }
  const existingApplication = {
    approvedAmount: null,
    createdAt: new Date("2026-07-09T00:00:00.000Z"),
    cycle: {
      id: existingCycle.id,
      periodMonth: existingCycle.periodMonth,
      releasedAmount: existingCycle.releasedAmount,
      status: existingCycle.status,
    },
    cycleId: existingCycle.id,
    id: "application-1",
    itemDescription: "Monthly food package",
    member,
    memberId: member.id,
    paidAmount: 0,
    paidAt: null,
    policyMaximumPaybackMonths: input?.foodPurchaseMaximumPaybackMonths ?? 1,
    requestedAmount: 75000,
    requestedPaybackMonths: 1,
    requestedAt: new Date("2026-07-09T00:00:00.000Z"),
    requestNotes: "Family food support.",
    reviewedAt: null,
    reviewedByUser: null,
    reviewedByUserId: null,
    reviewNotes: null,
    status: "submitted",
    submittedByUser: staffUser,
    submittedByUserId: staffUser.id,
    tenantId: "tenant-1",
    updatedAt: new Date("2026-07-09T00:00:00.000Z"),
    allowsCommitmentReductionDuringPayback:
      input?.foodPurchaseAllowsCommitmentReductionDuringPayback ?? false,
  }
  const tenantPolicy = {
    foodPurchaseAllowsCommitmentReductionDuringPayback:
      input?.foodPurchaseAllowsCommitmentReductionDuringPayback ?? false,
    foodPurchaseMaximumPaybackMonths:
      input?.foodPurchaseMaximumPaybackMonths ?? 1,
    shareConfigurationMode: "monthly_history",
  }

  const tx = {
    auditLog: {
      create: async (args: unknown) => {
        auditLogCreates.push(args)
        return args
      },
    },
    foodPurchaseApplication: {
      aggregate: async () => ({
        _sum: {
          approvedAmount: input?.approvedApplicationTotal ?? 0,
        },
      }),
      create: async (args: any) => {
        foodPurchaseApplicationCreates.push(args)
        return {
          ...existingApplication,
          ...args.data,
        }
      },
      findFirst: async () => existingApplication,
      update: async (args: any) => {
        foodPurchaseApplicationUpdates.push(args)
        return {
          ...existingApplication,
          ...args.data,
          reviewedByUser: reviewerUser,
        }
      },
    },
    foodPurchaseCycle: {
      create: async (args: any) => {
        foodPurchaseCycleCreates.push(args)
        return {
          ...existingCycle,
          ...args.data,
        }
      },
      findFirst: async () => existingCycle,
      update: async (args: any) => {
        foodPurchaseCycleUpdates.push(args)
        return {
          ...existingCycle,
          ...args.data,
          accountingSubmittedByUser: reviewerUser,
        }
      },
    },
    tenantPolicy: {
      findUnique: async () => tenantPolicy,
    },
  }

  return {
    $transaction: async (
      callback: (transaction: typeof tx) => Promise<unknown>
    ) => callback(tx),
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
    },
    auditLogCreates,
    backfillBatch: {
      count: async () => 0,
      findMany: async () => [],
    },
    chargeDefinitionVersion: {
      count: async () => 1,
    },
    foodPurchaseApplicationCreates,
    foodPurchaseApplicationUpdates,
    foodPurchaseApplication: {
      create: async (args: any) => tx.foodPurchaseApplication.create(args),
    },
    foodPurchaseCycle: {
      create: async (args: any) => tx.foodPurchaseCycle.create(args),
      findFirst: async () => (input?.existingCycle ? existingCycle : null),
    },
    foodPurchaseCycleCreates,
    foodPurchaseCycleUpdates,
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loan: {
      count: async () => 0,
    },
    member: {
      findFirst: async () =>
        input?.memberBelongsToTenant === false ? null : { id: member.id },
      findMany: async () => [],
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => tenant,
    },
    tenantBusinessPolicy: {
      findUnique: async () => null,
    },
    tenantPolicy: {
      findUnique: async () => tenantPolicy,
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
    user: {
      findFirst: async () =>
        input?.actorBelongsToTenant === false ? null : { id: staffUser.id },
    },
  }
}

describe("food purchase workflow", () => {
  test("blocks food purchase cycle creation before live operations", async () => {
    const prisma = createFoodPurchasePrismaStub({ canUseLiveWrites: false })

    await expect(
      createFoodPurchaseCycle(
        {
          actorUserId: "user-1",
          periodMonth: new Date("2026-07-19T12:00:00.000Z"),
          releasedAmount: 500000,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.foodPurchaseCycleCreates).toHaveLength(0)
  })

  test("creates a monthly cycle with released committee funds", async () => {
    const prisma = createFoodPurchasePrismaStub()

    const cycle = await createFoodPurchaseCycle(
      {
        actorUserId: "user-1",
        periodMonth: new Date("2026-07-19T12:00:00.000Z"),
        releasedAmount: 500000,
        releasedAt: new Date("2026-06-30T17:00:00.000Z"),
        releaseNotes: "Released to food committee.",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.foodPurchaseCycleCreates[0]).toMatchObject({
      data: {
        periodMonth: new Date("2026-07-01T00:00:00.000Z"),
        releasedAmount: 500000,
        releasedByUserId: "user-1",
        status: "open",
      },
    })
    expect(cycle.periodMonth.toISOString().slice(0, 10)).toBe("2026-07-01")
    expect(prisma.auditLogCreates).toHaveLength(1)
  })

  test("submits member food purchase application for an open cycle", async () => {
    const prisma = createFoodPurchasePrismaStub()

    const application = await submitFoodPurchaseApplication(
      {
        actorUserId: "user-1",
        cycleId: "cycle-1",
        itemDescription: "Monthly food package",
        memberId: "member-1",
        requestNotes: "Family food support.",
        requestedAmount: 75000,
        requestedPaybackMonths: 1,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.foodPurchaseApplicationCreates[0]).toMatchObject({
      data: {
        cycleId: "cycle-1",
        itemDescription: "Monthly food package",
        memberId: "member-1",
        requestedAmount: 75000,
        requestedPaybackMonths: 1,
        status: "submitted",
      },
    })
    expect(application.requestedAmount).toBe(75000)
    expect(application.requestedPaybackMonths).toBe(1)
    expect(application.member.email).toBe("aisha@example.com")
  })

  test("blocks food purchase application above tenant payback cap", async () => {
    const prisma = createFoodPurchasePrismaStub({
      foodPurchaseMaximumPaybackMonths: 1,
    })

    await expect(
      submitFoodPurchaseApplication(
        {
          actorUserId: "user-1",
          cycleId: "cycle-1",
          itemDescription: "Monthly food package",
          memberId: "member-1",
          requestNotes: "Family food support.",
          requestedAmount: 75000,
          requestedPaybackMonths: 2,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("cannot exceed 1")

    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(0)
  })

  test("approves application only within remaining released funds", async () => {
    const prisma = createFoodPurchasePrismaStub({
      approvedApplicationTotal: 450000,
    })

    await expect(
      reviewFoodPurchaseApplication(
        {
          actorUserId: "reviewer-1",
          applicationId: "application-1",
          approvedAmount: 75000,
          status: "approved",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("exceeds the remaining released committee funds")

    expect(prisma.foodPurchaseApplicationUpdates).toHaveLength(0)
  })

  test("blocks approved food purchase payback months above tenant cap", async () => {
    const prisma = createFoodPurchasePrismaStub({
      foodPurchaseMaximumPaybackMonths: 1,
    })

    await expect(
      reviewFoodPurchaseApplication(
        {
          actorUserId: "reviewer-1",
          applicationId: "application-1",
          approvedAmount: 75000,
          approvedPaybackMonths: 2,
          status: "approved",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("cannot exceed 1")

    expect(prisma.foodPurchaseApplicationUpdates).toHaveLength(0)
  })

  test("records end-of-month accounting and computes profit", async () => {
    const prisma = createFoodPurchasePrismaStub()

    const cycle = await recordFoodPurchaseAccounting(
      {
        actorUserId: "reviewer-1",
        cycleId: "cycle-1",
        notes: "July accounting submitted by committee.",
        operatingExpenseAmount: 25000,
        purchaseCostAmount: 500000,
        salesAmount: 620000,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.foodPurchaseCycleUpdates[0]).toMatchObject({
      data: {
        accountingSubmittedByUserId: "reviewer-1",
        operatingExpenseAmount: 25000,
        profitAmount: 95000,
        purchaseCostAmount: 500000,
        salesAmount: 620000,
        status: "accounting_submitted",
      },
      where: { id: "cycle-1" },
    })
    expect(cycle.profitAmount).toBe(95000)
  })

  test("reviews submitted accounting without posting downstream ledgers", async () => {
    const prisma = createFoodPurchasePrismaStub({
      cycleStatus: "accounting_submitted",
    })

    const cycle = await reviewFoodPurchaseAccounting(
      {
        actorUserId: "reviewer-1",
        cycleId: "cycle-1",
        decision: "approved",
        notes: "Accounting accepted for governance evidence.",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.foodPurchaseCycleUpdates[0]).toMatchObject({
      data: {
        status: "accounting_approved",
      },
      where: { id: "cycle-1" },
    })
    expect(cycle.status).toBe("accounting_approved")
    expect(prisma.auditLogCreates.at(-1)).toMatchObject({
      data: {
        action: "food_purchase.accounting_approved",
        metadata: {
          decision: "approved",
          notes: "Accounting accepted for governance evidence.",
          previousStatus: "accounting_submitted",
          status: "accounting_approved",
        },
      },
    })
  })

  test("blocks accounting review before committee accounting is submitted", async () => {
    const prisma = createFoodPurchasePrismaStub()

    await expect(
      reviewFoodPurchaseAccounting(
        {
          actorUserId: "reviewer-1",
          cycleId: "cycle-1",
          decision: "rejected",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Only submitted Foodstuff Purchase accounting can be reviewed")

    expect(prisma.foodPurchaseCycleUpdates).toHaveLength(0)
  })
})
