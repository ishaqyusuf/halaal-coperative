import { describe, expect, test } from "bun:test"
import {
  createFoodPurchaseApplicationPageCursor,
  createFoodPurchaseCycle,
  getFoodPurchaseApplicationSummary,
  listFoodPurchaseApplicationPage,
  recordFoodPurchaseAccounting,
  reviewFoodPurchaseAccounting,
  reviewFoodPurchaseApplication,
  submitFoodPurchaseApplication,
  transitionFoodPurchaseCycle,
} from "./food-purchase"

function createFoodPurchasePrismaStub(input?: {
  actorBelongsToTenant?: boolean
  applicationClaimCount?: number
  approvedApplicationTotal?: number
  activeFoodPurchaseApplications?: Array<{
    approvedAmount: number | null
    id: string
    memberId?: string
    paidAmount: number
    status: string
    tenantId?: string
  }>
  canUseLiveWrites?: boolean
  cycleClaimCount?: number
  cycleStatus?: string
  existingCycle?: boolean
  existingSubmission?: boolean
  foodPurchaseAccessMode?:
    | "disabled"
    | "member_self_service"
    | "office_only"
    | "read_only"
  foodPurchaseAllowsCommitmentReductionDuringPayback?: boolean
  foodPurchaseMaximumActiveObligationsPerMember?: number
  foodPurchaseMaximumPaybackMonths?: number
  foodPurchaseRequiresOpenCycle?: boolean
  memberBelongsToTenant?: boolean
  memberOperationalReady?: boolean
  serializationFailures?: number
  tenantStartDate?: Date
}) {
  const auditLogCreates: unknown[] = []
  const foodPurchaseApplicationFindManyArgs: unknown[] = []
  const foodPurchaseApplicationCreates: unknown[] = []
  const foodPurchaseApplicationUpdateManyArgs: unknown[] = []
  const foodPurchaseApplicationUpdates: unknown[] = []
  const foodPurchaseCycleCreates: unknown[] = []
  const foodPurchaseCycleUpdateManyArgs: unknown[] = []
  const foodPurchaseCycleUpdates: unknown[] = []
  const transactionOptions: unknown[] = []
  const serviceSettings = [
    {
      accessMode: input?.foodPurchaseAccessMode ?? "office_only",
      serviceKey: "food_purchase",
      tenantId: "tenant-1",
    },
  ]
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
    startDate: input?.tenantStartDate ?? new Date("2025-01-01T00:00:00.000Z"),
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
    foodPurchaseMaximumActiveObligationsPerMember:
      input?.foodPurchaseMaximumActiveObligationsPerMember ?? 1,
    foodPurchaseMaximumPaybackMonths:
      input?.foodPurchaseMaximumPaybackMonths ?? 1,
    foodPurchaseRequiresOpenCycle: input?.foodPurchaseRequiresOpenCycle ?? true,
    migrationSetupMode: "historical_backfill",
    shareConfigurationMode: "monthly_history",
  }

  const findActiveFoodPurchaseApplications = async (args: any) => {
    foodPurchaseApplicationFindManyArgs.push(args)

    return (input?.activeFoodPurchaseApplications ?? []).filter((row) => {
      const tenantMatches =
        !args.where?.tenantId ||
        (row.tenantId ?? "tenant-1") === args.where.tenantId
      const memberMatches =
        !args.where?.memberId ||
        (row.memberId ?? member.id) === args.where.memberId
      const statusMatches =
        !args.where?.status || row.status === args.where.status
      const approvedAmountMatches =
        !args.where?.approvedAmount ||
        !("not" in args.where.approvedAmount) ||
        row.approvedAmount !== args.where.approvedAmount.not

      return (
        tenantMatches && memberMatches && statusMatches && approvedAmountMatches
      )
    })
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
      count: async () => 0,
      findFirst: async () => existingApplication,
      findMany: findActiveFoodPurchaseApplications,
      update: async (args: any) => {
        foodPurchaseApplicationUpdates.push(args)
        return {
          ...existingApplication,
          ...args.data,
          reviewedByUser: reviewerUser,
        }
      },
      updateMany: async (args: any) => {
        foodPurchaseApplicationUpdateManyArgs.push(args)
        return { count: input?.applicationClaimCount ?? 1 }
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
      updateMany: async (args: any) => {
        foodPurchaseCycleUpdateManyArgs.push(args)
        return { count: input?.cycleClaimCount ?? 1 }
      },
    },
    tenantPolicy: {
      findUnique: async () => tenantPolicy,
    },
  }

  let serializationFailuresRemaining = input?.serializationFailures ?? 0

  return {
    $transaction: async (
      callback: (transaction: typeof tx) => Promise<unknown>,
      options?: unknown
    ) => {
      transactionOptions.push(options)

      if (serializationFailuresRemaining > 0) {
        serializationFailuresRemaining -= 1
        throw Object.assign(new Error("Serialization conflict"), {
          code: "P2034",
        })
      }

      return callback(tx)
    },
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
    foodPurchaseApplicationFindManyArgs,
    foodPurchaseApplicationUpdateManyArgs,
    foodPurchaseApplicationUpdates,
    foodPurchaseApplication: {
      create: async (args: any) => tx.foodPurchaseApplication.create(args),
      findFirst: async () =>
        input?.existingSubmission ? existingApplication : null,
      findMany: findActiveFoodPurchaseApplications,
    },
    foodPurchaseCycle: {
      create: async (args: any) => tx.foodPurchaseCycle.create(args),
      findFirst: async () => (input?.existingCycle ? existingCycle : null),
    },
    foodPurchaseCycleCreates,
    foodPurchaseCycleUpdateManyArgs,
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
      findMany: async () => [
        {
          id: member.id,
          joinedAt: new Date("2099-01-01T00:00:00.000Z"),
          kycStatus:
            input?.memberOperationalReady === false
              ? "not_started"
              : "verified",
          status: "active",
        },
      ],
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
    tenantOperationProfile: {
      create: async ({ data }: { data: { tenantId: string } }) => ({
        id: "operation-profile-1",
        reviewedAt: new Date("2026-07-01T00:00:00.000Z"),
        reviewedByUserId: "user-1",
        tenantId: data.tenantId,
      }),
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        where.tenantId === "tenant-1"
          ? {
              id: "operation-profile-1",
              reviewedAt: new Date("2026-07-01T00:00:00.000Z"),
              reviewedByUserId: "user-1",
              tenantId: "tenant-1",
            }
          : null,
    },
    tenantServiceSetting: {
      findMany: async ({ where }: { where: { tenantId: string } }) =>
        serviceSettings.filter(
          (setting) => setting.tenantId === where.tenantId
        ),
      upsert: async (upsertInput: {
        create: {
          accessMode: string
          serviceKey: string
          tenantId: string
        }
        where: {
          tenantId_serviceKey: {
            serviceKey: string
            tenantId: string
          }
        }
      }) => {
        const existing = serviceSettings.find(
          (setting) =>
            setting.tenantId ===
              upsertInput.where.tenantId_serviceKey.tenantId &&
            setting.serviceKey ===
              upsertInput.where.tenantId_serviceKey.serviceKey
        )

        if (existing) return existing

        serviceSettings.push(upsertInput.create)

        return upsertInput.create
      },
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
    user: {
      findFirst: async () =>
        input?.actorBelongsToTenant === false ? null : { id: staffUser.id },
    },
    transactionOptions,
  }
}

describe("food purchase workflow", () => {
  test("returns total, approved, and pending application summary counts", async () => {
    const countArgs: any[] = []
    const prisma = {
      foodPurchaseApplication: {
        count: async (args: any) => {
          countArgs.push(args)

          if (args.where.status === "approved") return 2
          if (args.where.status) return 3
          return 7
        },
      },
    }

    await expect(
      getFoodPurchaseApplicationSummary(
        { memberId: "member-1", tenantId: "tenant-1" },
        prisma as never
      )
    ).resolves.toEqual({
      approvedApplications: 2,
      pendingApplications: 3,
      totalApplications: 7,
    })
    expect(countArgs[0]).toEqual({
      where: { memberId: "member-1", tenantId: "tenant-1" },
    })
  })

  test("uses an opaque keyset cursor with nullable primary values", async () => {
    const reads: Record<string, unknown>[] = []
    const cursor = createFoodPurchaseApplicationPageCursor(
      {
        approvedAmount: null,
        approvedPaybackMonths: null,
        allowsCommitmentReductionDuringPayback: false,
        createdAt: new Date("2026-07-08T10:00:00.000Z"),
        cycle: {
          id: "cycle-1",
          periodMonth: new Date("2026-07-01T00:00:00.000Z"),
          releasedAmount: 500000,
          status: "open",
        },
        cycleId: "cycle-1",
        id: "application-2",
        itemDescription: null,
        member: {
          email: null,
          fullName: "Zainab Yusuf",
          id: "member-2",
          memberNumber: "M-002",
        },
        memberId: "member-2",
        paidAmount: 0,
        paidAt: null,
        policyMaximumPaybackMonths: 1,
        requestedAmount: 75000,
        requestedAt: new Date("2026-07-08T10:00:00.000Z"),
        requestedPaybackMonths: 1,
        requestNotes: null,
        reviewedAt: null,
        reviewedByUser: null,
        reviewedByUserId: null,
        reviewNotes: null,
        status: "submitted",
        submittedByUser: {
          email: "staff@example.com",
          fullName: "Staff",
          id: "user-1",
        },
        submittedByUserId: "user-1",
        updatedAt: new Date("2026-07-08T10:00:00.000Z"),
      },
      ["approvedAmount", "asc"]
    )

    await listFoodPurchaseApplicationPage(
      {
        cursor,
        pageSize: 20,
        sort: ["approvedAmount", "asc"],
        tenantId: "tenant-1",
      },
      {
        foodPurchaseApplication: {
          count: async () => 0,
          findMany: async (input: Record<string, unknown>) => {
            reads.push(input)
            return []
          },
        },
      } as never
    )

    expect(cursor).not.toBe("application-2")
    expect(reads[0]).toMatchObject({
      orderBy: [
        { approvedAmount: { nulls: "last", sort: "asc" } },
        { requestedAt: "desc" },
        { id: "desc" },
      ],
      take: 21,
      where: {
        AND: [{ tenantId: "tenant-1" }, { OR: expect.any(Array) }],
      },
    })
    expect(reads[0]).not.toHaveProperty("cursor")
  })

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

  test("blocks cycle dates before the cooperative start date", async () => {
    const prisma = createFoodPurchasePrismaStub({
      tenantStartDate: new Date("2025-01-01T00:00:00.000Z"),
    })

    await expect(
      createFoodPurchaseCycle(
        {
          actorUserId: "user-1",
          periodMonth: new Date("2024-12-01T00:00:00.000Z"),
          releasedAmount: 500000,
          releasedAt: new Date("2025-01-02T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("cannot be before the cooperative start date")

    expect(prisma.foodPurchaseCycleCreates).toHaveLength(0)
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

  test("returns the canonical Foodstuff Purchase application for a duplicate submission key", async () => {
    const prisma = createFoodPurchasePrismaStub({ existingSubmission: true })

    const application = await submitFoodPurchaseApplication(
      {
        actorUserId: "user-1",
        cycleId: "cycle-1",
        memberId: "member-1",
        requestedAmount: 75000,
        requestedPaybackMonths: 1,
        submissionKey: "00000000-0000-4000-8000-000000000302",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(application.id).toBe("application-1")
    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(0)
  })

  test("rejects submission when the cycle changes during the transaction", async () => {
    const prisma = createFoodPurchasePrismaStub({ cycleClaimCount: 0 })

    await expect(
      submitFoodPurchaseApplication(
        {
          actorUserId: "user-1",
          cycleId: "cycle-1",
          memberId: "member-1",
          requestedAmount: 75000,
          requestedPaybackMonths: 1,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("cycle changed")

    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(0)
  })

  test("blocks food purchase application for a closed cycle when open-cycle policy requires it", async () => {
    const prisma = createFoodPurchasePrismaStub({
      cycleStatus: "closed",
      foodPurchaseRequiresOpenCycle: true,
    })

    await expect(
      submitFoodPurchaseApplication(
        {
          actorUserId: "user-1",
          cycleId: "cycle-1",
          itemDescription: "Monthly food package",
          memberId: "member-1",
          requestedAmount: 75000,
          requestedPaybackMonths: 1,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("finalized or accounting-submitted cycle")

    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(0)
  })

  test("blocks food purchase application for a terminal cycle when open-cycle policy is off", async () => {
    const prisma = createFoodPurchasePrismaStub({
      cycleStatus: "closed",
      foodPurchaseRequiresOpenCycle: false,
    })

    await expect(
      submitFoodPurchaseApplication(
        {
          actorUserId: "user-1",
          cycleId: "cycle-1",
          itemDescription: "Monthly food package",
          memberId: "member-1",
          requestedAmount: 75000,
          requestedPaybackMonths: 1,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("finalized or accounting-submitted cycle")

    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(0)
  })

  test("blocks staff-assisted submission when the member is not operationally ready", async () => {
    const prisma = createFoodPurchasePrismaStub({
      memberOperationalReady: false,
    })

    await expect(
      submitFoodPurchaseApplication(
        {
          actorUserId: "user-1",
          cycleId: "cycle-1",
          memberId: "member-1",
          requestSource: "staff",
          requestedAmount: 75000,
          requestedPaybackMonths: 1,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Member verification is required")

    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(0)
  })

  test("blocks food purchase application at the active obligation cap", async () => {
    const prisma = createFoodPurchasePrismaStub({
      activeFoodPurchaseApplications: [
        {
          approvedAmount: 75000,
          id: "application-active-1",
          paidAmount: 25000,
          status: "approved",
        },
      ],
      foodPurchaseMaximumActiveObligationsPerMember: 1,
    })

    await expect(
      submitFoodPurchaseApplication(
        {
          actorUserId: "user-1",
          cycleId: "cycle-1",
          itemDescription: "Monthly food package",
          memberId: "member-1",
          requestedAmount: 75000,
          requestedPaybackMonths: 1,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("active Foodstuff Purchase obligation limit (1)")

    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(0)
  })

  test("does not count submitted, under-review, rejected, cancelled, or paid food purchase applications toward the cap", async () => {
    const prisma = createFoodPurchasePrismaStub({
      activeFoodPurchaseApplications: [
        {
          approvedAmount: null,
          id: "application-submitted",
          paidAmount: 0,
          status: "submitted",
        },
        {
          approvedAmount: null,
          id: "application-under-review",
          paidAmount: 0,
          status: "under_review",
        },
        {
          approvedAmount: null,
          id: "application-rejected",
          paidAmount: 0,
          status: "rejected",
        },
        {
          approvedAmount: null,
          id: "application-cancelled",
          paidAmount: 0,
          status: "cancelled",
        },
        {
          approvedAmount: 75000,
          id: "application-paid",
          paidAmount: 75000,
          status: "approved",
        },
      ],
      foodPurchaseMaximumActiveObligationsPerMember: 1,
    })

    const application = await submitFoodPurchaseApplication(
      {
        actorUserId: "user-1",
        cycleId: "cycle-1",
        itemDescription: "Monthly food package",
        memberId: "member-1",
        requestedAmount: 75000,
        requestedPaybackMonths: 1,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(application.status).toBe("submitted")
    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(1)
  })

  test("counts active food purchase obligations by tenant and member", async () => {
    const prisma = createFoodPurchasePrismaStub({
      activeFoodPurchaseApplications: [
        {
          approvedAmount: 75000,
          id: "application-active-1",
          memberId: "member-1",
          paidAmount: 0,
          status: "approved",
          tenantId: "tenant-1",
        },
        {
          approvedAmount: 75000,
          id: "application-other-member",
          memberId: "member-2",
          paidAmount: 0,
          status: "approved",
          tenantId: "tenant-1",
        },
        {
          approvedAmount: 75000,
          id: "application-other-tenant",
          memberId: "member-1",
          paidAmount: 0,
          status: "approved",
          tenantId: "tenant-2",
        },
      ],
      foodPurchaseMaximumActiveObligationsPerMember: 2,
    })

    await submitFoodPurchaseApplication(
      {
        actorUserId: "user-1",
        cycleId: "cycle-1",
        itemDescription: "Monthly food package",
        memberId: "member-1",
        requestedAmount: 75000,
        requestedPaybackMonths: 1,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.foodPurchaseApplicationFindManyArgs[0]).toMatchObject({
      where: {
        approvedAmount: { not: null },
        memberId: "member-1",
        status: "approved",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(1)
  })

  test("blocks member-created food purchase applications when service is office-only", async () => {
    const prisma = createFoodPurchasePrismaStub({
      foodPurchaseAccessMode: "office_only",
    })

    await expect(
      submitFoodPurchaseApplication(
        {
          actorUserId: "user-1",
          cycleId: "cycle-1",
          itemDescription: "Monthly food package",
          memberId: "member-1",
          requestSource: "member_self_service",
          requestedAmount: 75000,
          requestedPaybackMonths: 1,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("cooperative office")

    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(0)
  })

  test("allows member-created food purchase applications when self-service is enabled", async () => {
    const prisma = createFoodPurchasePrismaStub({
      foodPurchaseAccessMode: "member_self_service",
    })

    const application = await submitFoodPurchaseApplication(
      {
        actorUserId: "user-1",
        cycleId: "cycle-1",
        itemDescription: "Monthly food package",
        memberId: "member-1",
        requestSource: "member_self_service",
        requestedAmount: 75000,
        requestedPaybackMonths: 1,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(application.status).toBe("submitted")
    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(1)
  })

  test("blocks staff-created food purchase applications when service is read-only", async () => {
    const prisma = createFoodPurchasePrismaStub({
      foodPurchaseAccessMode: "read_only",
    })

    await expect(
      submitFoodPurchaseApplication(
        {
          actorUserId: "user-1",
          cycleId: "cycle-1",
          itemDescription: "Monthly food package",
          memberId: "member-1",
          requestSource: "staff",
          requestedAmount: 75000,
          requestedPaybackMonths: 1,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("read-only")

    expect(prisma.foodPurchaseApplicationCreates).toHaveLength(0)
  })

  test("blocks new food purchase cycles when service is disabled", async () => {
    const prisma = createFoodPurchasePrismaStub({
      foodPurchaseAccessMode: "disabled",
    })

    await expect(
      createFoodPurchaseCycle(
        {
          actorUserId: "user-1",
          periodMonth: new Date("2026-07-19T12:00:00.000Z"),
          releasedAmount: 500000,
          requestSource: "staff",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("not enabled")

    expect(prisma.foodPurchaseCycleCreates).toHaveLength(0)
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

  test("rechecks the active obligation cap when approving", async () => {
    const prisma = createFoodPurchasePrismaStub({
      activeFoodPurchaseApplications: [
        {
          approvedAmount: 75000,
          id: "application-active-1",
          paidAmount: 0,
          status: "approved",
        },
      ],
      foodPurchaseMaximumActiveObligationsPerMember: 1,
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
    ).rejects.toThrow("active Foodstuff Purchase obligation limit (1)")

    expect(prisma.foodPurchaseApplicationUpdateManyArgs).toHaveLength(0)
    expect(prisma.foodPurchaseApplicationUpdates).toHaveLength(0)
  })

  test("claims application review atomically in a serializable transaction", async () => {
    const prisma = createFoodPurchasePrismaStub()

    const application = await reviewFoodPurchaseApplication(
      {
        actorUserId: "reviewer-1",
        applicationId: "application-1",
        status: "under_review",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(application.status).toBe("under_review")
    expect(prisma.foodPurchaseApplicationUpdateManyArgs[0]).toMatchObject({
      data: {
        reviewedByUserId: "reviewer-1",
        status: "under_review",
      },
      where: {
        id: "application-1",
        reviewedAt: null,
        status: "submitted",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.transactionOptions.at(-1)).toEqual({
      isolationLevel: "Serializable",
      maxWait: 5000,
      timeout: 15000,
    })
  })

  test("rejects a stale concurrent application review claim", async () => {
    const prisma = createFoodPurchasePrismaStub({ applicationClaimCount: 0 })

    await expect(
      reviewFoodPurchaseApplication(
        {
          actorUserId: "reviewer-1",
          applicationId: "application-1",
          status: "rejected",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("already reviewed by another request")

    expect(prisma.foodPurchaseApplicationUpdates).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })

  test("retries serialization conflicts with a bounded attempt count", async () => {
    const prisma = createFoodPurchasePrismaStub({ serializationFailures: 2 })

    await reviewFoodPurchaseApplication(
      {
        actorUserId: "reviewer-1",
        applicationId: "application-1",
        status: "under_review",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.transactionOptions).toHaveLength(3)
    expect(prisma.foodPurchaseApplicationUpdates).toHaveLength(1)
  })

  test("rejects unsupported application review statuses exactly", async () => {
    const prisma = createFoodPurchasePrismaStub()

    await expect(
      reviewFoodPurchaseApplication(
        {
          actorUserId: "reviewer-1",
          applicationId: "application-1",
          status: "submitted" as never,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("review status is not supported")

    expect(prisma.transactionOptions).toHaveLength(0)
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
    const prisma = createFoodPurchasePrismaStub({
      cycleStatus: "intake_closed",
    })

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
    expect(prisma.foodPurchaseCycleUpdateManyArgs[0]).toMatchObject({
      data: { status: "accounting_submitted" },
      where: {
        id: "cycle-1",
        status: "intake_closed",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.transactionOptions.at(-1)).toMatchObject({
      isolationLevel: "Serializable",
    })
  })

  test("requires closed intake before committee accounting is submitted", async () => {
    const prisma = createFoodPurchasePrismaStub({ cycleStatus: "open" })

    await expect(
      recordFoodPurchaseAccounting(
        {
          actorUserId: "reviewer-1",
          cycleId: "cycle-1",
          operatingExpenseAmount: 25000,
          purchaseCostAmount: 500000,
          salesAmount: 620000,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Close Foodstuff Purchase intake")

    expect(prisma.foodPurchaseCycleUpdates).toHaveLength(0)
  })

  test("moves a draft cycle into open intake with an expected-state claim", async () => {
    const prisma = createFoodPurchasePrismaStub({ cycleStatus: "draft" })

    await transitionFoodPurchaseCycle(
      {
        actorUserId: "reviewer-1",
        cycleId: "cycle-1",
        expectedStatus: "draft",
        tenantId: "tenant-1",
        transition: "open_intake",
      },
      prisma as never
    )

    expect(prisma.foodPurchaseCycleUpdateManyArgs[0]).toMatchObject({
      data: { status: "open" },
      where: {
        id: "cycle-1",
        status: "draft",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.auditLogCreates.at(-1)).toMatchObject({
      data: {
        action: "food_purchase.cycle_open_intake",
        metadata: {
          previousStatus: "draft",
          status: "open",
        },
      },
    })
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
    expect(prisma.foodPurchaseCycleUpdateManyArgs[0]).toMatchObject({
      data: { status: "accounting_approved" },
      where: {
        id: "cycle-1",
        status: "accounting_submitted",
        tenantId: "tenant-1",
      },
    })
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
    ).rejects.toThrow(
      "Only submitted Foodstuff Purchase accounting can be reviewed"
    )

    expect(prisma.foodPurchaseCycleUpdates).toHaveLength(0)
  })

  test("rejects unsupported accounting review decisions exactly", async () => {
    const prisma = createFoodPurchasePrismaStub({
      cycleStatus: "accounting_submitted",
    })

    await expect(
      reviewFoodPurchaseAccounting(
        {
          actorUserId: "reviewer-1",
          cycleId: "cycle-1",
          decision: "cancelled" as never,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("review decision is not supported")

    expect(prisma.transactionOptions).toHaveLength(0)
  })

  test("rejects a stale concurrent accounting review claim", async () => {
    const prisma = createFoodPurchasePrismaStub({
      cycleClaimCount: 0,
      cycleStatus: "accounting_submitted",
    })

    await expect(
      reviewFoodPurchaseAccounting(
        {
          actorUserId: "reviewer-1",
          cycleId: "cycle-1",
          decision: "approved",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("already reviewed by another request")

    expect(prisma.foodPurchaseCycleUpdates).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })
})
