import { describe, expect, test } from "bun:test"
import { getApplicableChargeQuoteHash } from "./charges"
import {
  activateProjectFinancingRequest,
  createProjectFinancingRequest,
  createProjectFinancingRequestPageCursor,
  getProjectFinancingSummary,
  listProjectFinancingRequestPage,
  recordProjectFinancingDisbursement,
  redactProjectFinancingRequestForMember,
  reviewProjectFinancingRequest,
} from "./project-financing"

function createProjectFinancingPrismaStub(input?: {
  actorBelongsToTenant?: boolean
  canUseLiveWrites?: boolean
  existingSubmission?: boolean
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
  let existingProjectFinancingRequest = {
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
        existingProjectFinancingRequest = {
          ...existingProjectFinancingRequest,
          ...args.data,
          disbursedByUser: args.data.disbursedByUserId ? reviewerUser : null,
          reviewedByUser: reviewerUser,
        }
        return existingProjectFinancingRequest
      },
      updateMany: async (args: any) => {
        projectFinancingRequestUpdates.push(args)
        if (args.where.status !== existingProjectFinancingRequest.status) {
          return { count: 0 }
        }
        existingProjectFinancingRequest = {
          ...existingProjectFinancingRequest,
          ...args.data,
          reviewedByUser: reviewerUser,
        }
        return { count: 1 }
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
      findFirst: async () =>
        input?.existingSubmission ? existingProjectFinancingRequest : null,
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

  test("rejects changed member-reviewed charges before creating a project request", async () => {
    const prisma = createProjectFinancingPrismaStub()

    await expect(
      createProjectFinancingRequest(
        {
          actorUserId: "user-1",
          businessName: "Aisha Foods",
          expectedChargeQuoteHash: "0".repeat(64),
          memberId: "member-1",
          requestedAmount: 600000,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("charges changed"),
    })
    expect(prisma.projectFinancingRequestCreates).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })

  test("accepts the exact reviewed charge hash for the submitted amount", async () => {
    const prisma = createProjectFinancingPrismaStub()
    const request = await createProjectFinancingRequest(
      {
        actorUserId: "user-1",
        businessName: "Aisha Foods",
        expectedChargeQuoteHash: getApplicableChargeQuoteHash([], 600000),
        memberId: "member-1",
        requestedAmount: 600000,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(request.requestedAmount).toBe(600000)
    expect(prisma.projectFinancingRequestCreates).toHaveLength(1)
  })

  test("returns the canonical project request for a duplicate submission key", async () => {
    const prisma = createProjectFinancingPrismaStub({
      existingSubmission: true,
    })

    const request = await createProjectFinancingRequest(
      {
        actorUserId: "user-1",
        businessName: "Aisha Foods",
        memberId: "member-1",
        proposedStructure: "repayable_facility",
        requestedAmount: 600000,
        requestedPaybackMonths: 12,
        submissionKey: "00000000-0000-4000-8000-000000000303",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(request.id).toBe("project-financing-1")
    expect(prisma.projectFinancingRequestCreates).toHaveLength(0)
  })

  test("requires payback months only for repayable project structures", async () => {
    const prisma = createProjectFinancingPrismaStub()

    await expect(
      createProjectFinancingRequest(
        {
          actorUserId: "user-1",
          businessName: "Aisha Foods",
          memberId: "member-1",
          proposedStructure: "repayable_facility",
          requestedAmount: 600000,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" })

    await expect(
      createProjectFinancingRequest(
        {
          actorUserId: "user-1",
          businessName: "Aisha Foods",
          memberId: "member-1",
          proposedStructure: "profit_sharing",
          requestedAmount: 600000,
          requestedPaybackMonths: 12,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" })

    expect(prisma.projectFinancingRequestCreates).toHaveLength(0)
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

  test("scopes project financing summary counts and totals to the member", async () => {
    const countCalls: unknown[] = []
    const aggregateCalls: unknown[] = []
    const prisma = {
      projectFinancingRequest: {
        aggregate: async (args: unknown) => {
          aggregateCalls.push(args)

          if (aggregateCalls.length === 1) {
            return { _sum: { requestedAmount: 2200000 } }
          }
          if (aggregateCalls.length === 2) {
            return { _sum: { approvedAmount: 1800000 } }
          }
          if (aggregateCalls.length === 3) {
            return { _sum: { approvedAmount: 1400000 } }
          }
          return { _sum: { paidAmount: 300000 } }
        },
        count: async (args: unknown) => {
          countCalls.push(args)

          if (countCalls.length === 1) return 1
          if (countCalls.length === 2) return 2
          if (countCalls.length === 3) return 3
          if (countCalls.length === 4) return 1
          return 6
        },
      },
    }

    const summary = await getProjectFinancingSummary(
      "tenant-1",
      prisma as never,
      "member-1"
    )

    expect(summary).toEqual({
      activeRequests: 1,
      approvedRequests: 3,
      outstandingAmount: 1100000,
      pendingRequests: 2,
      rejectedRequests: 1,
      totalRequests: 6,
      totalApprovedAmount: 1800000,
      totalRequestedAmount: 2200000,
    })
    expect(countCalls[2]).toMatchObject({
      where: {
        memberId: "member-1",
        status: { in: ["approved", "active", "completed"] },
        tenantId: "tenant-1",
      },
    })
    expect(countCalls[4]).toMatchObject({
      where: { memberId: "member-1", tenantId: "tenant-1" },
    })
    expect(aggregateCalls[1]).toMatchObject({
      where: {
        memberId: "member-1",
        status: { in: ["approved", "active", "completed"] },
        tenantId: "tenant-1",
      },
    })
    expect(aggregateCalls[2]).toMatchObject({
      where: {
        approvedStructure: "repayable_facility",
        memberId: "member-1",
        status: { in: ["approved", "active", "completed"] },
        tenantId: "tenant-1",
      },
    })
    expect(aggregateCalls[3]).toMatchObject({
      where: {
        approvedStructure: "repayable_facility",
        memberId: "member-1",
        status: { in: ["approved", "active", "completed"] },
        tenantId: "tenant-1",
      },
    })
  })

  test("uses an ordering-aware opaque cursor and bounds page ownership in the DB", async () => {
    const base = {
      approvedAmount: 500000,
      approvedMonthlyPayback: 50000,
      approvedPaybackMonths: 10,
      approvedStructure: "repayable_facility",
      businessDescription: null,
      businessName: "Aisha Foods",
      createdAt: new Date("2026-07-09T00:00:00.000Z"),
      createdByUser: {
        email: "staff@example.com",
        fullName: "Finance Officer",
        id: "user-1",
      },
      createdByUserId: "user-1",
      disbursedAt: null,
      disbursedByUser: null,
      disbursedByUserId: null,
      disbursementNotes: null,
      disbursementReference: null,
      estimatedMonthlyPayback: 50000,
      member: {
        email: "member@example.com",
        fullName: "Aisha Member",
        id: "member-1",
        memberNumber: "M-001",
      },
      memberId: "member-1",
      paidAmount: 0,
      paidAt: null,
      projectPurpose: null,
      proposedStructure: "repayable_facility",
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
    } as const
    const rows = ["1", "2", "3"].map((id, index) => ({
      ...base,
      businessName: `Business ${id}`,
      id: `project-financing-${id}`,
      requestedAt: new Date(`2026-07-0${9 - index}T00:00:00.000Z`),
    }))
    const findManyCalls: unknown[] = []
    const prisma = {
      projectFinancingRequest: {
        count: async () => rows.length,
        findMany: async (args: unknown) => {
          findManyCalls.push(args)
          return rows
        },
      },
    }

    const firstPage = await listProjectFinancingRequestPage(
      { pageSize: 2, tenantId: "tenant-1" },
      prisma as never
    )

    expect(firstPage.data).toHaveLength(2)
    expect(firstPage.meta.cursor).toBeDefined()
    expect(firstPage.meta.cursor).not.toBe(firstPage.data.at(-1)?.id)
    expect(findManyCalls[0]).toMatchObject({ take: 3 })

    await listProjectFinancingRequestPage(
      {
        cursor: firstPage.meta.cursor,
        pageSize: 2,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(findManyCalls[1]).toMatchObject({
      take: 3,
      where: { AND: expect.any(Array) },
    })
  })

  test("canonicalizes legacy status sort and redacts member-facing contact previews", () => {
    const request = {
      approvedAmount: 500000,
      approvedMonthlyPayback: 50000,
      approvedPaybackMonths: 10,
      approvedStructure: "repayable_facility",
      businessDescription: null,
      businessName: "Aisha Foods",
      createdAt: new Date("2026-07-09T00:00:00.000Z"),
      createdByUser: {
        email: "staff@example.com",
        fullName: "Finance Officer",
        id: "user-1",
      },
      createdByUserId: "user-1",
      disbursedAt: new Date("2026-07-10T00:00:00.000Z"),
      disbursedByUser: {
        email: "disburser@example.com",
        fullName: "Disburser",
        id: "user-2",
      },
      disbursedByUserId: "user-2",
      disbursementNotes: null,
      disbursementReference: null,
      estimatedMonthlyPayback: 50000,
      id: "project-financing-1",
      member: {
        email: "member@example.com",
        fullName: "Aisha Member",
        id: "member-1",
        memberNumber: "M-001",
      },
      memberId: "member-1",
      paidAmount: 0,
      paidAt: null,
      projectPurpose: null,
      proposedStructure: "repayable_facility",
      requestedAmount: 600000,
      requestedAt: new Date("2026-07-09T00:00:00.000Z"),
      requestedPaybackMonths: 12,
      reviewedAt: null,
      reviewedByUser: {
        email: "reviewer@example.com",
        fullName: "Reviewer",
        id: "user-3",
      },
      reviewedByUserId: "user-3",
      reviewNotes: null,
      status: "submitted",
      updatedAt: new Date("2026-07-09T00:00:00.000Z"),
    } as const

    const cursor = createProjectFinancingRequestPageCursor(request, [
      "status",
      "asc",
    ])
    const decodedCursor = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    )

    expect(decodedCursor.sortField).toBe("requestedAt")
    expect(redactProjectFinancingRequestForMember(request)).toMatchObject({
      createdByUser: { email: null },
      disbursedByUser: { email: null },
      member: { email: null },
      reviewedByUser: { email: null },
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

  test("activates only a complete approved repayable structure", async () => {
    const prisma = createProjectFinancingPrismaStub({
      existingRequestOverrides: {
        approvedAmount: 720000,
        approvedMonthlyPayback: 40000,
        approvedPaybackMonths: 18,
        approvedStructure: "repayable_facility",
        status: "approved",
      },
    })

    const request = await activateProjectFinancingRequest(
      {
        actorUserId: "reviewer-1",
        expectedStatus: "approved",
        notes: "Committee approval and principal terms verified.",
        projectFinancingRequestId: "project-financing-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(request.status).toBe("active")
    expect(prisma.projectFinancingRequestUpdates.at(-1)).toMatchObject({
      data: { status: "active" },
      where: {
        id: "project-financing-1",
        status: "approved",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.auditLogCreates.at(-1)).toMatchObject({
      data: {
        action: "project_financing.structure_activated",
        metadata: {
          approvedAmount: 720000,
          approvedPaybackMonths: 18,
          approvedStructure: "repayable_facility",
          previousStatus: "approved",
          status: "active",
        },
      },
    })
  })

  test("activates partnership and profit-sharing structures without debt terms", async () => {
    for (const approvedStructure of [
      "investment_partnership",
      "profit_sharing",
    ] as const) {
      const prisma = createProjectFinancingPrismaStub({
        existingRequestOverrides: {
          approvedAmount: 720000,
          approvedMonthlyPayback: null,
          approvedPaybackMonths: null,
          approvedStructure,
          status: "approved",
        },
      })

      const request = await activateProjectFinancingRequest(
        {
          actorUserId: "reviewer-1",
          expectedStatus: "approved",
          notes: "Governance terms verified without creating a debt schedule.",
          projectFinancingRequestId: "project-financing-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )

      expect(request).toMatchObject({ approvedStructure, status: "active" })
      expect(prisma.auditLogCreates.at(-1)).toMatchObject({
        data: {
          action: "project_financing.structure_activated",
          metadata: {
            approvedPaybackMonths: null,
            approvedStructure,
          },
        },
      })
    }
  })

  test("rejects repayable activation when approved term evidence is missing", async () => {
    const prisma = createProjectFinancingPrismaStub({
      existingRequestOverrides: {
        approvedAmount: 720000,
        approvedMonthlyPayback: null,
        approvedPaybackMonths: null,
        approvedStructure: "repayable_facility",
        status: "approved",
      },
    })

    await expect(
      activateProjectFinancingRequest(
        {
          actorUserId: "reviewer-1",
          expectedStatus: "approved",
          notes: "Activate facility.",
          projectFinancingRequestId: "project-financing-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" })

    expect(prisma.projectFinancingRequestUpdates).toHaveLength(0)
  })

  test("records release evidence only after explicit mobile activation", async () => {
    const prisma = createProjectFinancingPrismaStub({
      existingRequestOverrides: {
        approvedAmount: 720000,
        approvedMonthlyPayback: 40000,
        approvedPaybackMonths: 18,
        approvedStructure: "repayable_facility",
        status: "active",
      },
    })

    const request = await recordProjectFinancingDisbursement(
      {
        actorUserId: "reviewer-1",
        disbursedAt: new Date("2026-07-31T12:00:00.000Z"),
        expectedStatus: "active",
        notes: "Transfer evidence verified.",
        projectFinancingRequestId: "project-financing-1",
        reference: "PF-TRF-002",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(request.disbursementReference).toBe("PF-TRF-002")
    expect(prisma.projectFinancingRequestUpdates.at(-1)).toMatchObject({
      where: {
        disbursedAt: null,
        id: "project-financing-1",
        status: "active",
        tenantId: "tenant-1",
      },
    })
  })

  test("rejects duplicate activation and duplicate release evidence", async () => {
    const alreadyActive = createProjectFinancingPrismaStub({
      existingRequestOverrides: {
        approvedAmount: 720000,
        approvedStructure: "investment_partnership",
        status: "active",
      },
    })

    await expect(
      activateProjectFinancingRequest(
        {
          actorUserId: "reviewer-1",
          expectedStatus: "approved",
          projectFinancingRequestId: "project-financing-1",
          tenantId: "tenant-1",
        },
        alreadyActive as never
      )
    ).rejects.toMatchObject({ code: "CONFLICT" })
    expect(alreadyActive.projectFinancingRequestUpdates).toHaveLength(0)

    const alreadyReleased = createProjectFinancingPrismaStub({
      existingRequestOverrides: {
        approvedAmount: 720000,
        approvedStructure: "investment_partnership",
        disbursedAt: new Date("2026-07-31T12:00:00.000Z"),
        disbursementReference: "PF-TRF-EXISTING",
        status: "active",
      },
    })

    await expect(
      recordProjectFinancingDisbursement(
        {
          actorUserId: "reviewer-1",
          disbursedAt: new Date("2026-08-01T12:00:00.000Z"),
          expectedStatus: "active",
          projectFinancingRequestId: "project-financing-1",
          reference: "PF-TRF-DUPLICATE",
          tenantId: "tenant-1",
        },
        alreadyReleased as never
      )
    ).rejects.toMatchObject({ code: "CONFLICT" })
    expect(alreadyReleased.projectFinancingRequestUpdates).toHaveLength(0)
  })

  test("rejects a cross-tenant activation actor before mutation", async () => {
    const prisma = createProjectFinancingPrismaStub({
      actorBelongsToTenant: false,
      existingRequestOverrides: {
        approvedAmount: 720000,
        approvedMonthlyPayback: 40000,
        approvedPaybackMonths: 18,
        approvedStructure: "repayable_facility",
        status: "approved",
      },
    })

    await expect(
      activateProjectFinancingRequest(
        {
          actorUserId: "outsider-1",
          expectedStatus: "approved",
          projectFinancingRequestId: "project-financing-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" })

    expect(prisma.projectFinancingRequestUpdates).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })
})
