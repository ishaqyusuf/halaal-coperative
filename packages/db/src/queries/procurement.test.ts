import { describe, expect, test } from "bun:test"
import {
  createProcurementRequest,
  getProcurementSummary,
  listProcurementRequests,
  recordProcurementPurchase,
  reviewProcurementRequest,
} from "./procurement"

function startOfDayUtc(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

function addDaysUtc(value: Date, days: number) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate() + days
    )
  )
}

function procurementRequestRow(overrides: Record<string, unknown> = {}) {
  return {
    approvedCost: 180000,
    approvedMonthlyRepayment: 20000,
    approvedRepaymentMonths: 9,
    createdAt: new Date("2026-07-08T00:00:00.000Z"),
    createdByUser: {
      email: "staff@example.com",
      fullName: "Finance Officer",
      id: "user-1",
    },
    createdByUserId: "user-1",
    estimatedMonthlyRepayment: 25000,
    id: "procurement-1",
    itemDescription: "Energy-efficient refrigerator",
    itemName: "Refrigerator",
    member: {
      email: "aisha@example.com",
      fullName: "Aisha Member",
      id: "member-1",
      memberNumber: "M-001",
    },
    memberId: "member-1",
    requestedAt: new Date("2026-07-08T00:00:00.000Z"),
    requestedCost: 150000,
    requestedRepaymentMonths: 6,
    repaymentScheduleItems: [],
    reviewedAt: new Date("2026-07-08T12:00:00.000Z"),
    reviewedByUser: {
      email: "reviewer@example.com",
      fullName: "Reviewer",
      id: "reviewer-1",
    },
    reviewedByUserId: "reviewer-1",
    reviewNotes: null,
    purchasedAt: new Date("2026-07-31T10:00:00.000Z"),
    purchasedByUserId: "buyer-1",
    purchaseNotes: null,
    purchaseReference: "INV-100",
    status: "active",
    tenantId: "tenant-1",
    vendorName: "Local Vendor",
    ...overrides,
  }
}

function createProcurementPrismaStub(input?: {
  activeFinancingCount?: number
  activeProcurementObligationCount?: number
  canUseLiveWrites?: boolean
  existingRequestOverrides?: Record<string, unknown>
  procurementAccessMode?:
    | "disabled"
    | "member_self_service"
    | "office_only"
    | "read_only"
  policyOverrides?: Record<string, unknown>
}) {
  const auditLogCreates: unknown[] = []
  const procurementRequestCreates: unknown[] = []
  const procurementRequestCounts: unknown[] = []
  const procurementRepaymentScheduleCreates: unknown[] = []
  const procurementRequestUpdates: unknown[] = []
  const serviceSettings = [
    {
      accessMode: input?.procurementAccessMode ?? "office_only",
      serviceKey: "procurement",
      tenantId: "tenant-1",
    },
  ]
  const canUseLiveWrites = input?.canUseLiveWrites ?? true
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
  const existingProcurementRequest = {
    approvedCost: null,
    approvedMonthlyRepayment: null,
    approvedRepaymentMonths: null,
    allowsCommitmentReductionDuringPayback: false,
    createdAt: new Date("2026-07-08T00:00:00.000Z"),
    createdByUser: {
      email: "staff@example.com",
      fullName: "Finance Officer",
      id: "user-1",
    },
    createdByUserId: "user-1",
    estimatedMonthlyRepayment: 25000,
    id: "procurement-1",
    itemDescription: "Energy-efficient refrigerator",
    itemName: "Refrigerator",
    member: {
      email: "aisha@example.com",
      fullName: "Aisha Member",
      id: "member-1",
      memberNumber: "M-001",
    },
    memberId: "member-1",
    policyMaximumPaybackMonths: 12,
    requestedAt: new Date("2026-07-08T00:00:00.000Z"),
    requestedCost: 150000,
    requestedRepaymentMonths: 6,
    repaymentScheduleItems: [],
    reviewedAt: null,
    reviewedByUser: null,
    reviewedByUserId: null,
    reviewNotes: null,
    purchasedAt: null,
    purchasedByUserId: null,
    purchaseNotes: null,
    purchaseReference: null,
    status: "submitted",
    tenantId: "tenant-1",
    vendorName: "Local Vendor",
    ...(input?.existingRequestOverrides ?? {}),
  }

  const tx = {
    auditLog: {
      create: async (args: unknown) => {
        auditLogCreates.push(args)
        return args
      },
    },
    procurementRequest: {
      count: async () => input?.activeProcurementObligationCount ?? 0,
      create: async (args: any) => {
        procurementRequestCreates.push(args)
        return {
          ...existingProcurementRequest,
          ...args.data,
        }
      },
      findFirst: async () => existingProcurementRequest,
      update: async (args: any) => {
        procurementRequestUpdates.push(args)
        return {
          ...existingProcurementRequest,
          ...args.data,
          reviewedByUser: {
            email: "reviewer@example.com",
            fullName: "Reviewer",
            id: args.data.reviewedByUserId,
          },
        }
      },
    },
    procurementRepaymentScheduleItem: {
      count: async () => 0,
      createMany: async (args: any) => {
        procurementRepaymentScheduleCreates.push(args)
        return { count: args.data.length }
      },
    },
    tenantPolicy: {
      findUnique: async () => ({
        activeFinancingBlocksProcurement: true,
        procurementAllowsCommitmentReductionDuringPayback: false,
        procurementMaximumPaybackMonths: 12,
        ...(input?.policyOverrides ?? {}),
      }),
    },
  }

  return {
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
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
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loan: {
      count: async () => input?.activeFinancingCount ?? 0,
    },
    member: {
      findFirst: async () => ({ id: "member-1" }),
      findMany: async () => [],
    },
    procurementRequest: {
      count: async (args: unknown) => {
        procurementRequestCounts.push(args)

        return input?.activeProcurementObligationCount ?? 0
      },
    },
    procurementRequestCreates,
    procurementRequestCounts,
    procurementRequestUpdates,
    procurementRepaymentScheduleCreates,
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => tenant,
    },
    tenantPolicy: {
      findUnique: async () => ({
        activeFinancingBlocksProcurement: true,
        procurementAllowsCommitmentReductionDuringPayback: false,
        procurementMaximumPaybackMonths: 12,
        ...(input?.policyOverrides ?? {}),
      }),
    },
    tenantOperationProfile: {
      upsert: async () => ({
        id: "operation-profile-1",
        reviewedAt: new Date("2026-07-01T00:00:00.000Z"),
        reviewedByUserId: "user-1",
        tenantId: "tenant-1",
      }),
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
  }
}

describe("procurement request workflow", () => {
  test("blocks procurement requests before live operations", async () => {
    const prisma = createProcurementPrismaStub({ canUseLiveWrites: false })

    await expect(
      createProcurementRequest(
        {
          actorUserId: "user-1",
          itemName: "Phone",
          memberId: "member-1",
          requestedCost: 120000,
          requestedRepaymentMonths: 6,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.procurementRequestCreates).toHaveLength(0)
  })

  test("blocks procurement while member has active financing when policy requires it", async () => {
    const prisma = createProcurementPrismaStub({ activeFinancingCount: 1 })

    await expect(
      createProcurementRequest(
        {
          actorUserId: "user-1",
          itemName: "Phone",
          memberId: "member-1",
          requestedCost: 120000,
          requestedRepaymentMonths: 6,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("blocks procurement")

    expect(prisma.procurementRequestCreates).toHaveLength(0)
  })

  test("creates procurement request with monthly repayment estimate when policy allows overlap", async () => {
    const prisma = createProcurementPrismaStub({
      activeFinancingCount: 1,
      policyOverrides: {
        activeFinancingBlocksProcurement: false,
        procurementAllowsCommitmentReductionDuringPayback: true,
        procurementMaximumPaybackMonths: 12,
      },
    })

    const request = await createProcurementRequest(
      {
        actorUserId: "user-1",
        itemDescription: "Energy-efficient refrigerator",
        itemName: "Refrigerator",
        memberId: "member-1",
        allowsCommitmentReductionDuringPayback: true,
        policyMaximumPaybackMonths: 12,
        requestedCost: 150000,
        requestedRepaymentMonths: 6,
        tenantId: "tenant-1",
        vendorName: "Local Vendor",
      },
      prisma as never
    )

    expect(prisma.procurementRequestCreates[0]).toMatchObject({
      data: {
        estimatedMonthlyRepayment: 25000,
        itemName: "Refrigerator",
        memberId: "member-1",
        requestedCost: 150000,
        requestedRepaymentMonths: 6,
        status: "submitted",
      },
    })
    expect(request.estimatedMonthlyRepayment).toBe(25000)
  })

  test("blocks member-created procurement when service is office-only", async () => {
    const prisma = createProcurementPrismaStub({
      procurementAccessMode: "office_only",
    })

    await expect(
      createProcurementRequest(
        {
          actorUserId: "user-1",
          itemName: "Phone",
          memberId: "member-1",
          requestSource: "member_self_service",
          requestedCost: 120000,
          requestedRepaymentMonths: 6,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("cooperative office")

    expect(prisma.procurementRequestCreates).toHaveLength(0)
  })

  test("allows member-created procurement when self-service is enabled", async () => {
    const prisma = createProcurementPrismaStub({
      procurementAccessMode: "member_self_service",
    })

    const request = await createProcurementRequest(
      {
        actorUserId: "user-1",
        itemName: "Phone",
        memberId: "member-1",
        requestSource: "member_self_service",
        requestedCost: 120000,
        requestedRepaymentMonths: 6,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(request.status).toBe("submitted")
    expect(prisma.procurementRequestCreates).toHaveLength(1)
  })

  test("blocks staff-created procurement when service is read-only", async () => {
    const prisma = createProcurementPrismaStub({
      procurementAccessMode: "read_only",
    })

    await expect(
      createProcurementRequest(
        {
          actorUserId: "user-1",
          itemName: "Phone",
          memberId: "member-1",
          requestSource: "staff",
          requestedCost: 120000,
          requestedRepaymentMonths: 6,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("read-only")

    expect(prisma.procurementRequestCreates).toHaveLength(0)
  })

  test("blocks staff-created procurement when service is disabled", async () => {
    const prisma = createProcurementPrismaStub({
      procurementAccessMode: "disabled",
    })

    await expect(
      createProcurementRequest(
        {
          actorUserId: "user-1",
          itemName: "Phone",
          memberId: "member-1",
          requestSource: "staff",
          requestedCost: 120000,
          requestedRepaymentMonths: 6,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("not enabled")

    expect(prisma.procurementRequestCreates).toHaveLength(0)
  })

  test("blocks procurement request above tenant payback cap", async () => {
    const prisma = createProcurementPrismaStub({
      policyOverrides: { procurementMaximumPaybackMonths: 3 },
    })

    await expect(
      createProcurementRequest(
        {
          actorUserId: "user-1",
          itemName: "Refrigerator",
          memberId: "member-1",
          requestedCost: 150000,
          requestedRepaymentMonths: 6,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("cannot exceed 3")

    expect(prisma.procurementRequestCreates).toHaveLength(0)
  })

  test("blocks procurement request at the active obligation cap", async () => {
    const prisma = createProcurementPrismaStub({
      activeProcurementObligationCount: 1,
      policyOverrides: {
        procurementMaximumActiveObligationsPerMember: 1,
      },
    })

    await expect(
      createProcurementRequest(
        {
          actorUserId: "user-1",
          itemName: "Phone",
          memberId: "member-1",
          requestedCost: 120000,
          requestedRepaymentMonths: 6,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("active procurement obligation limit (1)")

    expect(prisma.procurementRequestCreates).toHaveLength(0)
  })

  test("counts only tenant-scoped active unpaid procurement obligations", async () => {
    const prisma = createProcurementPrismaStub({
      activeProcurementObligationCount: 1,
      policyOverrides: {
        procurementMaximumActiveObligationsPerMember: 2,
      },
    })

    await createProcurementRequest(
      {
        actorUserId: "user-1",
        itemName: "Phone",
        memberId: "member-1",
        requestedCost: 120000,
        requestedRepaymentMonths: 6,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.procurementRequestCounts[0]).toMatchObject({
      where: {
        memberId: "member-1",
        repaymentScheduleItems: {
          some: {
            status: { notIn: ["paid", "waived"] },
          },
        },
        status: { in: ["active", "purchased"] },
        tenantId: "tenant-1",
      },
    })
    expect(prisma.procurementRequestCreates).toHaveLength(1)
  })

  test("approves procurement request with reviewed cost and repayment plan", async () => {
    const prisma = createProcurementPrismaStub({
      policyOverrides: {
        procurementAllowsCommitmentReductionDuringPayback: true,
        procurementMaximumPaybackMonths: 12,
      },
    })

    const request = await reviewProcurementRequest(
      {
        actorUserId: "reviewer-1",
        approvedCost: 180000,
        approvedRepaymentMonths: 9,
        notes: "Approved at market cost.",
        procurementRequestId: "procurement-1",
        status: "approved",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.procurementRequestUpdates[0]).toMatchObject({
      data: {
        approvedCost: 180000,
        approvedMonthlyRepayment: 20000,
        approvedRepaymentMonths: 9,
        allowsCommitmentReductionDuringPayback: true,
        policyMaximumPaybackMonths: 12,
        reviewedByUserId: "reviewer-1",
        reviewNotes: "Approved at market cost.",
        status: "approved",
      },
      where: { id: "procurement-1" },
    })
    expect(request.approvedMonthlyRepayment).toBe(20000)
    expect(request.member.email).toBe("aisha@example.com")
    expect(request.allowsCommitmentReductionDuringPayback).toBe(true)
  })

  test("blocks approved procurement repayment months above tenant cap", async () => {
    const prisma = createProcurementPrismaStub({
      policyOverrides: { procurementMaximumPaybackMonths: 3 },
    })

    await expect(
      reviewProcurementRequest(
        {
          actorUserId: "reviewer-1",
          approvedCost: 180000,
          approvedRepaymentMonths: 9,
          notes: "Approved at market cost.",
          procurementRequestId: "procurement-1",
          status: "approved",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("cannot exceed 3")

    expect(prisma.procurementRequestUpdates).toHaveLength(0)
  })

  test("lists procurement schedules with due and overdue read-model status", async () => {
    const today = startOfDayUtc(new Date())
    const requests = await listProcurementRequests({ tenantId: "tenant-1" }, {
      procurementRequest: {
        findMany: async () => [
          procurementRequestRow({
            repaymentScheduleItems: [
              {
                amount: 20000,
                dueDate: addDaysUtc(today, -1),
                id: "schedule-overdue",
                installmentNumber: 1,
                paidAmount: 0,
                status: "pending",
              },
              {
                amount: 20000,
                dueDate: today,
                id: "schedule-due",
                installmentNumber: 2,
                paidAmount: 5000,
                status: "partially_paid",
              },
              {
                amount: 20000,
                dueDate: addDaysUtc(today, 20),
                id: "schedule-future",
                installmentNumber: 3,
                paidAmount: 0,
                status: "pending",
              },
              {
                amount: 20000,
                dueDate: addDaysUtc(today, -10),
                id: "schedule-paid",
                installmentNumber: 4,
                paidAmount: 20000,
                status: "paid",
              },
            ],
          }),
        ],
      },
    } as never)

    expect(requests[0].repaymentScheduleItems).toMatchObject([
      { id: "schedule-overdue", status: "overdue" },
      { id: "schedule-due", status: "due" },
      { id: "schedule-future", status: "pending" },
      { id: "schedule-paid", status: "paid" },
    ])
    expect(requests[0].outstandingAmount).toBe(55000)
  })

  test("summarizes due, overdue, and outstanding procurement schedules", async () => {
    const scheduleCountWheres: unknown[] = []

    const summary = await getProcurementSummary("tenant-1", {
      procurementRequest: {
        aggregate: async (input: any) => ({
          _sum: input.where.status
            ? { approvedCost: 250000 }
            : { requestedCost: 300000 },
        }),
        count: async (input: any) => {
          if (input.where.status === "approved") return 1
          if (input.where.status === "rejected") return 2
          if (input.where.status?.in?.includes("submitted")) return 3
          if (input.where.status?.in?.includes("active")) return 4
          return 0
        },
      },
      procurementRepaymentScheduleItem: {
        aggregate: async () => ({
          _sum: {
            amount: 90000,
            paidAmount: 25000,
          },
        }),
        count: async (input: any) => {
          scheduleCountWheres.push(input.where)
          return scheduleCountWheres.length === 1 ? 2 : 1
        },
      },
    } as never)

    expect(summary).toMatchObject({
      activeRequests: 4,
      approvedRequests: 1,
      dueScheduleItems: 2,
      outstandingAmount: 65000,
      overdueScheduleItems: 1,
      pendingRequests: 3,
      rejectedRequests: 2,
      totalApprovedCost: 250000,
      totalRequestedCost: 300000,
    })
    expect(scheduleCountWheres[0]).toMatchObject({
      status: { in: ["due", "overdue", "partially_paid", "pending"] },
      tenantId: "tenant-1",
    })
    expect(scheduleCountWheres[1]).toMatchObject({
      status: { in: ["due", "overdue", "partially_paid", "pending"] },
      tenantId: "tenant-1",
    })
  })

  test("records approved procurement purchase and creates repayment schedule", async () => {
    const prisma = createProcurementPrismaStub({
      existingRequestOverrides: {
        approvedCost: 180000,
        approvedMonthlyRepayment: 20000,
        approvedRepaymentMonths: 9,
        status: "approved",
      },
    })

    const request = await recordProcurementPurchase(
      {
        actorUserId: "buyer-1",
        firstDueDate: new Date("2026-08-31T00:00:00.000Z"),
        procurementRequestId: "procurement-1",
        purchaseDate: new Date("2026-07-31T10:00:00.000Z"),
        purchaseNotes: "Invoice confirmed.",
        purchaseReference: "INV-100",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect((prisma as any).procurementRequestUpdates[0]).toMatchObject({
      data: {
        purchaseNotes: "Invoice confirmed.",
        purchaseReference: "INV-100",
        purchasedByUserId: "buyer-1",
        status: "active",
      },
      where: { id: "procurement-1" },
    })
    expect(
      (prisma as any).procurementRepaymentScheduleCreates[0].data
    ).toHaveLength(9)
    expect(
      (prisma as any).procurementRepaymentScheduleCreates[0].data[0]
    ).toMatchObject({
      amount: 20000,
      dueDate: new Date("2026-08-31T00:00:00.000Z"),
      installmentNumber: 1,
      memberId: "member-1",
      procurementRequestId: "procurement-1",
      status: "pending",
      tenantId: "tenant-1",
    })
    expect(
      (prisma as any).procurementRepaymentScheduleCreates[0].data[1]
    ).toMatchObject({
      dueDate: new Date("2026-09-30T00:00:00.000Z"),
      installmentNumber: 2,
    })
    expect(
      (prisma as any).procurementRepaymentScheduleCreates[0].data.at(-1)
    ).toMatchObject({
      amount: 20000,
      installmentNumber: 9,
    })
    expect(request).toMatchObject({
      outstandingAmount: 180000,
      purchaseReference: "INV-100",
      status: "active",
    })
    expect((prisma as any).auditLogCreates.at(-1)).toMatchObject({
      data: {
        action: "procurement.purchase_recorded",
        actorUserId: "buyer-1",
        entityId: "procurement-1",
        metadata: {
          approvedCost: 180000,
          approvedRepaymentMonths: 9,
          memberId: "member-1",
          previousStatus: "approved",
          purchaseReference: "INV-100",
          scheduleTotal: 180000,
        },
      },
    })
  })
})
