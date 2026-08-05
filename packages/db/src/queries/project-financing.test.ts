import { describe, expect, test } from "bun:test"
import {
  createProjectFinancingRequest,
  getProjectFinancingSummary,
  recordProjectFinancingDisbursement,
  reviewProjectFinancingRequest,
} from "./project-financing"

function createProjectFinancingPrismaStub(input?: {
  actorBelongsToTenant?: boolean
  canUseLiveWrites?: boolean
  existingRequestOverrides?: Record<string, unknown>
  memberBelongsToTenant?: boolean
}) {
  const auditLogCreates: unknown[] = []
  const projectFinancingRequestCreates: unknown[] = []
  const projectFinancingRequestUpdates: unknown[] = []
  const canUseLiveWrites = input?.canUseLiveWrites ?? true
  const staffUser = {
    email: "staff@example.com",
    fullName: "Finance Officer",
    id: "user-1",
  }
  const reviewerUser = {
    email: "reviewer@example.com",
    fullName: "Reviewer",
    id: "reviewer-1",
  }
  const member = {
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
  const existingProjectFinancingRequest = {
    approvedAmount: null,
    approvedMonthlyPayback: null,
    approvedPaybackMonths: null,
    approvedStructure: null,
    businessDescription: "Cassava processing and retail.",
    businessName: "Aisha Foods",
    createdAt: new Date("2026-07-09T00:00:00.000Z"),
    createdByUser: staffUser,
    createdByUserId: staffUser.id,
    disbursedAt: null,
    disbursedByUser: null,
    disbursedByUserId: null,
    disbursementNotes: null,
    disbursementReference: null,
    estimatedMonthlyPayback: 50000,
    id: "project-financing-1",
    member,
    memberId: member.id,
    paidAmount: 0,
    paidAt: null,
    projectPurpose: "Buy processing equipment.",
    proposedStructure: "undecided",
    requestedAmount: 600000,
    requestedAt: new Date("2026-07-09T00:00:00.000Z"),
    requestedPaybackMonths: 12,
    reviewedAt: null,
    reviewedByUser: null,
    reviewedByUserId: null,
    reviewNotes: null,
    status: "submitted",
    tenantId: "tenant-1",
    updatedAt: new Date("2026-07-09T00:00:00.000Z"),
    ...(input?.existingRequestOverrides ?? {}),
  }

  const tx = {
    auditLog: {
      create: async (args: unknown) => {
        auditLogCreates.push(args)
        return args
      },
    },
    projectFinancingRequest: {
      create: async (args: any) => {
        projectFinancingRequestCreates.push(args)
        return {
          ...existingProjectFinancingRequest,
          ...args.data,
        }
      },
      findFirst: async () => existingProjectFinancingRequest,
      update: async (args: any) => {
        projectFinancingRequestUpdates.push(args)
        return {
          ...existingProjectFinancingRequest,
          ...args.data,
          disbursedByUser: args.data.disbursedByUserId ? reviewerUser : null,
          reviewedByUser: reviewerUser,
        }
      },
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
    projectFinancingRequest: {
      create: async (args: any) => tx.projectFinancingRequest.create(args),
    },
    projectFinancingRequestCreates,
    projectFinancingRequestUpdates,
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
      findUnique: async () => ({
        shareConfigurationMode: "monthly_history",
      }),
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

describe("project financing request workflow", () => {
  test("blocks project financing before live operations", async () => {
    const prisma = createProjectFinancingPrismaStub({
      canUseLiveWrites: false,
    })

    await expect(
      createProjectFinancingRequest(
        {
          actorUserId: "user-1",
          businessName: "Aisha Foods",
          memberId: "member-1",
          requestedAmount: 600000,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining(
        "Live financial record writes are locked"
      ),
      reportable: false,
    })

    expect(prisma.projectFinancingRequestCreates).toHaveLength(0)
  })

  test("creates a staged project financing request with principal-only payback estimate", async () => {
    const prisma = createProjectFinancingPrismaStub()

    const request = await createProjectFinancingRequest(
      {
        actorUserId: "user-1",
        businessDescription: "Cassava processing and retail.",
        businessName: "Aisha Foods",
        memberId: "member-1",
        projectPurpose: "Buy processing equipment.",
        proposedStructure: "repayable_facility",
        requestedAmount: 600000,
        requestedPaybackMonths: 12,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.projectFinancingRequestCreates[0]).toMatchObject({
      data: {
        businessName: "Aisha Foods",
        estimatedMonthlyPayback: 50000,
        memberId: "member-1",
        proposedStructure: "repayable_facility",
        requestedAmount: 600000,
        requestedPaybackMonths: 12,
        status: "submitted",
      },
    })
    expect(request.estimatedMonthlyPayback).toBe(50000)
    expect(prisma.auditLogCreates).toHaveLength(1)
  })

  test("requires a clarified structure before approval", async () => {
    const prisma = createProjectFinancingPrismaStub()

    await expect(
      reviewProjectFinancingRequest(
        {
          actorUserId: "reviewer-1",
          approvedAmount: 600000,
          projectFinancingRequestId: "project-financing-1",
          status: "approved",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("structure must be clarified")

    expect(prisma.projectFinancingRequestUpdates).toHaveLength(0)
  })

  test("approves repayable project financing with monthly payback evidence", async () => {
    const prisma = createProjectFinancingPrismaStub({
      existingRequestOverrides: {
        proposedStructure: "repayable_facility",
      },
    })

    const request = await reviewProjectFinancingRequest(
      {
        actorUserId: "reviewer-1",
        approvedAmount: 720000,
        approvedPaybackMonths: 18,
        approvedStructure: "repayable_facility",
        notes: "Approved as principal-only project financing.",
        projectFinancingRequestId: "project-financing-1",
        status: "approved",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.projectFinancingRequestUpdates[0]).toMatchObject({
      data: {
        approvedAmount: 720000,
        approvedMonthlyPayback: 40000,
        approvedPaybackMonths: 18,
        approvedStructure: "repayable_facility",
        reviewedByUserId: "reviewer-1",
        reviewNotes: "Approved as principal-only project financing.",
        status: "approved",
      },
      where: { id: "project-financing-1" },
    })
    expect(request.approvedMonthlyPayback).toBe(40000)
  })

  test("counts active and completed project financing as approved summary exposure", async () => {
    const countCalls: unknown[] = []
    const aggregateCalls: unknown[] = []
    const prisma = {
      projectFinancingRequest: {
        aggregate: async (args: unknown) => {
          aggregateCalls.push(args)

          if (aggregateCalls.length === 1) {
            return { _sum: { requestedAmount: 2200000 } }
          }

          return { _sum: { approvedAmount: 1800000 } }
        },
        count: async (args: unknown) => {
          countCalls.push(args)

          if (countCalls.length === 1) return 2
          if (countCalls.length === 2) return 3
          return 1
        },
      },
    }

    const summary = await getProjectFinancingSummary(
      "tenant-1",
      prisma as never
    )

    expect(summary).toEqual({
      approvedRequests: 3,
      pendingRequests: 2,
      rejectedRequests: 1,
      totalApprovedAmount: 1800000,
      totalRequestedAmount: 2200000,
    })
    expect(countCalls[1]).toMatchObject({
      where: {
        status: { in: ["approved", "active", "completed"] },
        tenantId: "tenant-1",
      },
    })
    expect(aggregateCalls[1]).toMatchObject({
      where: {
        status: { in: ["approved", "active", "completed"] },
        tenantId: "tenant-1",
      },
    })
  })

  test("records approved project financing disbursement evidence", async () => {
    const prisma = createProjectFinancingPrismaStub({
      existingRequestOverrides: {
        approvedAmount: 720000,
        approvedMonthlyPayback: 40000,
        approvedPaybackMonths: 18,
        approvedStructure: "repayable_facility",
        status: "approved",
      },
    })

    const request = await recordProjectFinancingDisbursement(
      {
        actorUserId: "reviewer-1",
        disbursedAt: new Date("2026-07-31T12:00:00.000Z"),
        notes: "Transfer confirmed by finance.",
        projectFinancingRequestId: "project-financing-1",
        reference: "PF-TRF-001",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.projectFinancingRequestUpdates.at(-1)).toMatchObject({
      data: {
        disbursedAt: new Date("2026-07-31T12:00:00.000Z"),
        disbursedByUserId: "reviewer-1",
        disbursementNotes: "Transfer confirmed by finance.",
        disbursementReference: "PF-TRF-001",
        status: "active",
      },
      where: { id: "project-financing-1" },
    })
    expect(request.status).toBe("active")
    expect(request.disbursementReference).toBe("PF-TRF-001")
    expect(prisma.auditLogCreates.at(-1)).toMatchObject({
      data: {
        action: "project_financing.disbursement_recorded",
        metadata: {
          approvedAmount: 720000,
          previousStatus: "approved",
          reference: "PF-TRF-001",
          status: "active",
        },
      },
    })
  })
})
