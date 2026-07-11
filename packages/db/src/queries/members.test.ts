import { describe, expect, test } from "bun:test"
import {
  createMember,
  createMemberDocument,
  getMemberStatementDetail,
  listMemberStatementSummaries,
  listMembersTable,
  updateMember,
  updateMemberDocumentReview,
  updateMemberKyc,
  updateMemberStatus,
} from "./members"

function createMemberPrismaStub({
  appliedBackfillBatches = 0,
  chargeScheduleVersions = 1,
  initialMigrationStatus = "historical_setup_in_progress",
  shareBusinessProfitEntries = 1,
  shareStructureVersions = 1,
  startDate = new Date("2025-01-01T00:00:00.000Z"),
}: {
  appliedBackfillBatches?: number
  chargeScheduleVersions?: number
  initialMigrationStatus?: string
  shareBusinessProfitEntries?: number
  shareStructureVersions?: number
  startDate?: Date | null
} = {}) {
  const contributionPlanCreateMany: unknown[] = []
  const memberCreates: unknown[] = []
  const memberAmountLogCreateMany: unknown[] = []
  const memberDocumentCreates: unknown[] = []
  const memberDocumentLookups: unknown[] = []
  const memberDocumentUpdates: unknown[] = []
  const memberUpdates: unknown[] = []

  const tx = {
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
      create: async (input: unknown) => input,
    },
    backfillBatch: {
      count: async () => appliedBackfillBatches,
      findMany: async () => [],
    },
    chargeDefinitionVersion: {
      count: async () => chargeScheduleVersions,
    },
    contributionPlan: {
      create: async (input: unknown) => input,
      createMany: async (input: unknown) => {
        contributionPlanCreateMany.push(input)

        return { count: 1 }
      },
    },
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loan: {
      count: async () => 0,
    },
    member: {
      create: async (input: {
        data: {
          address?: string | null
          email?: string | null
          fullName: string
          id?: string
          memberNumber: string
          memberType: string
          occupation?: string | null
          phoneNumber?: string | null
        }
      }) => {
        memberCreates.push(input)

        return {
          address: input.data.address ?? null,
          email: input.data.email ?? null,
          fullName: input.data.fullName,
          id: "member-1",
          memberNumber: input.data.memberNumber,
          memberType: input.data.memberType,
          occupation: input.data.occupation ?? null,
          phoneNumber: input.data.phoneNumber ?? null,
        }
      },
      findMany: async () => [],
      update: async (input: unknown) => {
        memberUpdates.push(input)

        return {
          fullName: "Updated Member",
          id: "member-1",
          memberNumber: "MBR-001",
          memberType: "individual",
        }
      },
    },
    memberAmountLog: {
      createMany: async (input: unknown) => {
        memberAmountLogCreateMany.push(input)

        return { count: 1 }
      },
    },
    memberDocument: {
      create: async (input: unknown) => {
        memberDocumentCreates.push(input)

        return {
          id: "member-document-1",
        }
      },
      findFirst: async (input: unknown) => {
        memberDocumentLookups.push(input)

        return {
          id: "member-document-1",
        }
      },
      update: async (input: unknown) => {
        memberDocumentUpdates.push(input)

        return {
          id: "member-document-1",
        }
      },
    },
    shareBusinessProfitEntry: {
      count: async () => shareBusinessProfitEntries,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus,
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt:
          initialMigrationStatus === "live_operations"
            ? new Date("2025-02-01T00:00:00.000Z")
            : null,
        startDate,
      }),
    },
    tenantShareStructureVersion: {
      count: async () => shareStructureVersions,
    },
  }

  return {
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
    contributionPlanCreateMany,
    memberAmountLogCreateMany,
    memberDocumentCreates,
    memberDocumentLookups,
    memberDocumentUpdates,
    memberCreates,
    memberUpdates,
  }
}

const memberInput = {
  actorUserId: "user-1",
  fullName: "Aisha Bello",
  joinedAt: new Date("2025-01-01T00:00:00.000Z"),
  memberNumber: "MBR-001",
  memberType: "individual" as const,
  tenantId: "tenant-1",
}

describe("member profile migration guards", () => {
  test("blocks member creation before historical finance setup is complete", async () => {
    const prisma = createMemberPrismaStub({
      chargeScheduleVersions: 0,
    })

    await expect(createMember(memberInput, prisma as never)).rejects.toThrow(
      "Member profiles cannot be created"
    )
    expect(prisma.memberCreates).toHaveLength(0)
  })

  test("blocks member creation after member backfill starts", async () => {
    const prisma = createMemberPrismaStub({
      appliedBackfillBatches: 1,
    })

    await expect(createMember(memberInput, prisma as never)).rejects.toThrow(
      "Member profiles are locked because member ledger backfill"
    )
    expect(prisma.memberCreates).toHaveLength(0)
  })

  test("allows member creation during migration after setup is ready", async () => {
    const prisma = createMemberPrismaStub()

    await createMember(memberInput, prisma as never)

    expect(prisma.memberCreates).toHaveLength(1)
  })

  test("allows member creation during migration without share history", async () => {
    const prisma = createMemberPrismaStub({
      shareStructureVersions: 0,
    })

    await createMember(memberInput, prisma as never)

    expect(prisma.memberCreates).toHaveLength(1)
  })

  test("allows member creation after tenant enters live operations", async () => {
    const prisma = createMemberPrismaStub({
      chargeScheduleVersions: 0,
      initialMigrationStatus: "live_operations",
      shareBusinessProfitEntries: 0,
      shareStructureVersions: 0,
      startDate: null,
    })

    await createMember(memberInput, prisma as never)

    expect(prisma.memberCreates).toHaveLength(1)
  })

  test("registers starting and historical commitments as contribution plan history", async () => {
    const prisma = createMemberPrismaStub()

    await createMember(
      {
        ...memberInput,
        commitmentHistory: [
          {
            amount: 20000,
            effectiveFrom: new Date("2025-03-01T00:00:00.000Z"),
            notes: "Adjusted commitment.",
          },
        ],
        monthlyCommitment: 10000,
      },
      prisma as never
    )

    expect(prisma.contributionPlanCreateMany).toHaveLength(1)
    expect(prisma.contributionPlanCreateMany[0]).toMatchObject({
      data: [
        {
          amount: 10000,
          endsAt: new Date("2025-03-01T00:00:00.000Z"),
          interval: "monthly",
          isActive: false,
          memberId: "member-1",
          name: "Monthly commitment",
          startsAt: new Date("2025-01-01T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        {
          amount: 20000,
          endsAt: null,
          interval: "monthly",
          isActive: true,
          memberId: "member-1",
          name: "Monthly commitment",
          startsAt: new Date("2025-03-01T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
      ],
    })
    expect(prisma.memberAmountLogCreateMany).toHaveLength(1)
  })

  test("blocks member updates after member backfill starts", async () => {
    const prisma = createMemberPrismaStub({
      appliedBackfillBatches: 1,
    })

    await expect(
      updateMember(
        "tenant-1",
        "member-1",
        {
          actorUserId: "user-1",
          fullName: "Updated Member",
        },
        prisma as never
      )
    ).rejects.toThrow(
      "Member profiles are locked because member ledger backfill"
    )
    expect(prisma.memberUpdates).toHaveLength(0)
  })

  test("updates member basic profile fields during migration setup", async () => {
    const prisma = createMemberPrismaStub()

    await updateMember(
      "tenant-1",
      "member-1",
      {
        actorUserId: "user-1",
        address: "No. 12 Cooperative Road",
        email: "aisha@example.com",
        fullName: "Aisha Bello Updated",
        memberType: "business",
        occupation: "Trader",
        phoneNumber: "+234 800 000 0000",
      },
      prisma as never
    )

    expect(prisma.memberUpdates).toEqual([
      {
        where: { id: "member-1", tenantId: "tenant-1" },
        data: {
          address: "No. 12 Cooperative Road",
          email: "aisha@example.com",
          fullName: "Aisha Bello Updated",
          memberType: "business",
          occupation: "Trader",
          phoneNumber: "+234 800 000 0000",
        },
      },
    ])
  })

  test("blocks member status updates before live operations", async () => {
    const prisma = createMemberPrismaStub()

    await expect(
      updateMemberStatus(
        "tenant-1",
        "member-1",
        "active",
        "user-1",
        prisma as never
      )
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberUpdates).toHaveLength(0)
  })

  test("blocks member KYC updates before live operations", async () => {
    const prisma = createMemberPrismaStub()

    await expect(
      updateMemberKyc(
        {
          actorUserId: "user-1",
          kycStatus: "verified",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberUpdates).toHaveLength(0)
  })

  test("blocks member document creation before live operations", async () => {
    const prisma = createMemberPrismaStub()

    await expect(
      createMemberDocument(
        {
          actorUserId: "user-1",
          documentType: "government_id",
          documentUrl: "https://example.com/id.pdf",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberDocumentCreates).toHaveLength(0)
  })

  test("blocks member document review before live operations", async () => {
    const prisma = createMemberPrismaStub()

    await expect(
      updateMemberDocumentReview(
        {
          actorUserId: "user-1",
          documentId: "member-document-1",
          reviewStatus: "approved",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberDocumentLookups).toHaveLength(0)
    expect(prisma.memberDocumentUpdates).toHaveLength(0)
  })
})

describe("members table backfill status", () => {
  test("maps not started, draft, and applied member backfill states", async () => {
    const prisma = {
      appliedBackfillMonth: {
        findMany: async () => [
          { memberId: "member-applied" },
          { memberId: "member-applied" },
        ],
      },
      backfillBatch: {
        findMany: async () => [
          {
            id: "batch-applied",
            memberId: "member-applied",
            status: "applied",
          },
          {
            id: "batch-draft",
            memberId: "member-draft",
            status: "generated",
          },
        ],
      },
      member: {
        findMany: async () => [
          {
            id: "member-empty",
            fullName: "No Backfill",
            memberNumber: "001",
          },
          {
            id: "member-draft",
            fullName: "Draft Backfill",
            memberNumber: "002",
          },
          {
            id: "member-applied",
            fullName: "Applied Backfill",
            memberNumber: "003",
          },
        ],
      },
    }

    const result = await listMembersTable(
      "tenant-1",
      { pageSize: 10 },
      prisma as never
    )
    const statusByMemberId = new Map(
      result.data.map((member) => [member.id, member.backfillStatus])
    )

    expect(statusByMemberId.get("member-empty")).toMatchObject({
      appliedBatchId: null,
      appliedMonthCount: 0,
      draftBatchId: null,
      state: "not_started",
    })
    expect(statusByMemberId.get("member-draft")).toMatchObject({
      appliedBatchId: null,
      appliedMonthCount: 0,
      draftBatchId: "batch-draft",
      state: "draft",
    })
    expect(statusByMemberId.get("member-applied")).toMatchObject({
      appliedBatchId: "batch-applied",
      appliedMonthCount: 2,
      draftBatchId: null,
      state: "applied",
    })
  })
})

const dividendStatementMemberRow = {
  address: null,
  contributionPlans: [
    {
      amount: 5000,
      isActive: true,
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  deductionSource: { name: "Payroll" },
  documents: [],
  email: "aisha@example.com",
  exitedAt: null,
  fullName: "Aisha Bello",
  id: "member-1",
  joinedAt: new Date("2025-01-01T00:00:00.000Z"),
  kycStatus: "verified",
  memberNumber: "M-001",
  memberType: "civil_servant",
  occupation: null,
  phoneNumber: null,
  status: "active",
  totalSavingsSnapshot: 40000,
  user: {
    email: "aisha.user@example.com",
    fullName: "Aisha Bello",
  },
}

function createMemberStatementPrismaStub() {
  return {
    chargeApplication: {
      findMany: async () => [
        {
          amount: 2500,
          assessedAt: new Date("2026-04-11T00:00:00.000Z"),
          chargeApplicability: {
            collectionMode: "deduct_from_savings",
            trigger: "approval",
            workflow: "project_financing_request",
          },
          chargeDefinition: {
            code: "PRJ",
            name: "Project review fee",
          },
          collectionMode: "deduct_from_savings",
          foodPurchaseApplication: null,
          id: "charge-application-1",
          loanRequest: null,
          procurementRequest: null,
          projectFinancingRequest: {
            businessName: "Aisha Stores",
            id: "project-financing-1",
            status: "approved",
          },
          status: "posted",
        },
        {
          amount: 1000,
          assessedAt: new Date("2026-04-12T00:00:00.000Z"),
          chargeApplicability: {
            collectionMode: "pay_separately",
            trigger: "submission",
            workflow: "food_purchase_application",
          },
          chargeDefinition: {
            code: "FOOD",
            name: "Foodstuff application fee",
          },
          collectionMode: "pay_separately",
          foodPurchaseApplication: {
            id: "food-purchase-1",
            status: "submitted",
          },
          id: "charge-application-2",
          loanRequest: null,
          procurementRequest: null,
          projectFinancingRequest: null,
          status: "pending",
        },
      ],
    },
    contribution: {
      findMany: async () => [],
      groupBy: async () => [
        {
          _count: { _all: 2 },
          _max: { postedAt: new Date("2026-03-31T00:00:00.000Z") },
          _sum: {
            amount: 30000,
            committedAmount: 25000,
            extraSavingsAmount: 5000,
          },
          memberId: "member-1",
        },
      ],
    },
    dividendAllocation: {
      findMany: async () => [
        {
          allocationAmount: 7500,
          createdAt: new Date("2026-04-10T00:00:00.000Z"),
          dividendPeriod: {
            deductionAmount: 1000,
            deductionReason: "Reserve",
            distributableAmount: 50000,
            id: "dividend-period-1",
            name: "Yearly dividend 2025",
            periodEnd: new Date("2025-12-31T00:00:00.000Z"),
            periodStart: new Date("2025-01-01T00:00:00.000Z"),
            publishedAt: new Date("2026-04-10T00:00:00.000Z"),
            status: "published",
            totalProfitAmount: 51000,
          },
          id: "dividend-allocation-1",
          savingsBasisAmount: 40000,
        },
      ],
      groupBy: async () => [
        {
          _count: { _all: 1 },
          _max: { createdAt: new Date("2026-04-10T00:00:00.000Z") },
          _sum: { allocationAmount: 7500 },
          memberId: "member-1",
        },
      ],
    },
    ledgerTransaction: {
      findMany: async () => [],
    },
    loan: {
      findMany: async () => [],
      groupBy: async () => [
        {
          _count: { _all: 1 },
          _sum: {
            estimatedMonthlyServicing: 5000,
            extraMonthlySavingsAmount: 1000,
            outstandingPrincipal: 15000,
            principalAmount: 30000,
          },
          memberId: "member-1",
        },
      ],
    },
    member: {
      findFirst: async () => dividendStatementMemberRow,
      findMany: async () => [dividendStatementMemberRow],
    },
    repayment: {
      findMany: async () => [],
      groupBy: async () => [
        {
          _max: { paidAt: new Date("2026-03-15T00:00:00.000Z") },
          _sum: { amount: 15000 },
          memberId: "member-1",
        },
      ],
    },
  }
}

describe("member statement dividend allocations", () => {
  test("summarizes published dividend allocations", async () => {
    const summaries = await listMemberStatementSummaries(
      "tenant-1",
      createMemberStatementPrismaStub() as never
    )

    expect(summaries[0]).toMatchObject({
      dividendAllocationCount: 1,
      lastDividendAllocatedAt: new Date("2026-04-10T00:00:00.000Z"),
      memberId: "member-1",
      totalDividendAllocations: 7500,
    })
  })

  test("loads published dividend allocation evidence into member statement detail", async () => {
    const detail = await getMemberStatementDetail(
      "tenant-1",
      "member-1",
      createMemberStatementPrismaStub() as never
    )

    expect(detail?.dividendAllocations).toEqual([
      expect.objectContaining({
        allocationAmount: 7500,
        dividendPeriod: expect.objectContaining({
          name: "Yearly dividend 2025",
          status: "published",
        }),
        savingsBasisAmount: 40000,
      }),
    ])
    expect(detail?.summary).toMatchObject({
      totalDividendAllocations: 7500,
    })
  })

  test("loads workflow-linked posted and pending charges into member statement detail", async () => {
    const detail = await getMemberStatementDetail(
      "tenant-1",
      "member-1",
      createMemberStatementPrismaStub() as never
    )

    expect(detail?.chargeApplications).toEqual([
      expect.objectContaining({
        chargeDefinition: expect.objectContaining({
          name: "Project review fee",
        }),
        collectionMode: "deduct_from_savings",
        projectFinancingRequest: expect.objectContaining({
          businessName: "Aisha Stores",
        }),
        status: "posted",
      }),
      expect.objectContaining({
        chargeDefinition: expect.objectContaining({
          name: "Foodstuff application fee",
        }),
        collectionMode: "pay_separately",
        foodPurchaseApplication: expect.objectContaining({
          status: "submitted",
        }),
        status: "pending",
      }),
    ])
  })
})
