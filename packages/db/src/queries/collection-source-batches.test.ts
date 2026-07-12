import { describe, expect, test } from "bun:test"
import {
  postCollectionSourceContributionBatchRows,
  stageCollectionSourceContributionBatch,
  updateCollectionSourceContributionBatchRows,
} from "./collection-source-batches"

const liveTenant = {
  id: "tenant-1",
  initialMigrationStatus: "live_operations",
  migrationEmergencyUnlockUntil: null,
  migrationFinalizedAt: new Date("2026-07-01T00:00:00.000Z"),
  startDate: new Date("2026-01-01T00:00:00.000Z"),
}

function createCollectionSourceBatchPrismaStub(input?: {
  existingRowCount?: number
  serviceMode?: string
}) {
  const auditCreates: any[] = []
  const batchRowCreates: any[] = []
  const batchRowUpdates: any[] = []
  const batchUpdates: any[] = []
  const contributionCreates: any[] = []
  const ledgerTransactions: any[] = []
  const memberLookups: any[] = []
  const transactions: any[] = []
  const batch = {
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    deductionSource: {
      externalReference: "MIN-EDU",
      id: "source-1",
      name: "Ministry of Education",
      type: "ministry_payroll",
    },
    deductionSourceId: "source-1",
    id: "batch-1",
    notes: null,
    periodLabel: "June 2026",
    periodMonth: 6,
    periodYear: 2026,
    postedAt: null,
    reference: null,
    status: "staged",
  }
  const rowStore = [
    {
      batchId: "batch-1",
      blocker: null,
      contributionId: null,
      contributionPlanId: "plan-1",
      expectedAmount: 50000,
      exceptionReason: null,
      id: "row-1",
      member: {
        fullName: "Aisha Musa",
        id: "member-1",
        memberNumber: "HV-001",
        status: "active",
      },
      memberId: "member-1",
      paidAmount: 0,
      postedAt: null,
      status: "staged",
      tenantId: "tenant-1",
    },
    {
      batchId: "batch-1",
      blocker: null,
      contributionId: null,
      contributionPlanId: "plan-2",
      expectedAmount: 40000,
      exceptionReason: null,
      id: "row-2",
      member: {
        fullName: "Bala Sani",
        id: "member-2",
        memberNumber: "HV-002",
        status: "active",
      },
      memberId: "member-2",
      paidAmount: 0,
      postedAt: null,
      status: "staged",
      tenantId: "tenant-1",
    },
  ]
  const prisma: any = {
    $transaction: async (callback: (tx: any) => Promise<unknown>) => {
      transactions.push(callback)
      return callback(prisma)
    },
    appliedBackfillMonth: { findMany: async () => [] },
    auditLog: {
      count: async () => 0,
      create: async (args: any) => {
        auditCreates.push(args)
        return args
      },
    },
    backfillBatch: {
      count: async () => 0,
      findMany: async () => [],
    },
    chargeDefinitionVersion: { count: async () => 1 },
    collectionSourceContributionBatch: {
      findFirst: async (args: any) => ({
        ...batch,
        rows: rowStore,
      }),
      findMany: async () => [],
      update: async (args: any) => {
        batchUpdates.push(args)
        Object.assign(batch, args.data)
        return batch
      },
      upsert: async (args: any) => {
        Object.assign(batch, args.create, args.update)
        return batch
      },
    },
    collectionSourceContributionBatchRow: {
      count: async () => input?.existingRowCount ?? 0,
      create: async (args: any) => {
        batchRowCreates.push(args)
        return args.data
      },
      findFirst: async (args: any) =>
        rowStore.find((row) => row.id === args.where.id) ?? null,
      findMany: async (args: any) => {
        if (args.where?.id?.in) {
          return rowStore.filter((row) => args.where.id.in.includes(row.id))
        }
        return rowStore
      },
      update: async (args: any) => {
        batchRowUpdates.push(args)
        const row = rowStore.find((item) => item.id === args.where.id)
        if (row) Object.assign(row, args.data)
        return row
      },
    },
    contribution: {
      create: async (args: any) => {
        contributionCreates.push(args)
        return { id: `contribution-${contributionCreates.length}`, ...args.data }
      },
    },
    deductionSource: {
      findFirst: async (args: any) =>
        args.where.tenantId === "tenant-1" && args.where.id === "source-1"
          ? batch.deductionSource
          : null,
    },
    ledgerAccount: {
      findUnique: async (args: any) => ({
        code: args.where.tenantId_code.code,
        id: `ledger-${args.where.tenantId_code.code}`,
      }),
    },
    ledgerTransaction: {
      create: async (args: any) => {
        ledgerTransactions.push(args)
        return { id: "ledger-transaction-1", ...args.data }
      },
    },
    legacyLoanMigrationDraft: { count: async () => 0 },
    loan: { count: async () => 0 },
    member: {
      findFirst: async (args: any) => {
        memberLookups.push(args)
        return { paymentAllocationPreference: "savings_first" }
      },
      findMany: async (args: any) =>
        args?.include?.contributionPlans
          ? [
              {
                contributionPlans: [
                  {
                    amount: 50000,
                    id: "plan-1",
                  },
                ],
                fullName: "Aisha Musa",
                id: "member-1",
                memberNumber: "HV-001",
                status: "active",
              },
              {
                contributionPlans: [],
                fullName: "Bala Sani",
                id: "member-2",
                memberNumber: "HV-002",
                status: "active",
              },
              {
                contributionPlans: [
                  {
                    amount: 25000,
                    id: "plan-3",
                  },
                ],
                fullName: "Chika Okoro",
                id: "member-3",
                memberNumber: "HV-003",
                status: "suspended",
              },
            ]
          : [],
      update: async (args: any) => args,
    },
    shareBusinessProfitEntry: { count: async () => 1 },
    tenant: { findUnique: async () => liveTenant },
    tenantOperationProfile: {
      upsert: async () => ({
        id: "profile-1",
        reviewedAt: null,
        reviewedByUserId: null,
      }),
    },
    tenantPolicy: {
      findUnique: async () => ({
        foodPurchaseMaximumActiveObligationsPerMember: 1,
        foodPurchaseRequiresOpenCycle: true,
        procurementMaximumActiveObligationsPerMember: 1,
      }),
    },
    tenantServiceSetting: {
      findMany: async () => [
        {
          accessMode: input?.serviceMode ?? "office_only",
          serviceKey: "collection_source_batch_posting",
        },
      ],
      upsert: async (args: any) => args.create,
    },
    tenantShareStructureVersion: { count: async () => 1 },
    auditCreates,
    batch,
    batchRowCreates,
    batchRowUpdates,
    batchUpdates,
    contributionCreates,
    ledgerTransactions,
    memberLookups,
    rowStore,
    transactions,
  }

  return prisma
}

describe("collection source contribution batches", () => {
  test("stages source members with expected commitments and blockers", async () => {
    const prisma = createCollectionSourceBatchPrismaStub()

    const result = await stageCollectionSourceContributionBatch(
      {
        actorUserId: "user-1",
        deductionSourceId: "source-1",
        month: 6,
        tenantId: "tenant-1",
        year: 2026,
      },
      prisma,
    )

    expect(prisma.batchRowCreates).toHaveLength(3)
    expect(prisma.batchRowCreates[0].data).toMatchObject({
      expectedAmount: 50000,
      memberId: "member-1",
      status: "staged",
    })
    expect(prisma.batchRowCreates[1].data).toMatchObject({
      blocker: "missing_active_commitment_plan",
      expectedAmount: 0,
      memberId: "member-2",
      status: "blocked",
    })
    expect(prisma.batchRowCreates[2].data).toMatchObject({
      blocker: "member_not_active",
      memberId: "member-3",
      status: "blocked",
    })
    expect(result.periodLabel).toBe("June 2026")
    expect(prisma.auditCreates.at(-1).data.action).toBe(
      "collection_source_batch.staged",
    )
  })

  test("returns an existing staged batch without creating duplicate rows", async () => {
    const prisma = createCollectionSourceBatchPrismaStub({
      existingRowCount: 2,
    })

    await stageCollectionSourceContributionBatch(
      {
        actorUserId: "user-1",
        deductionSourceId: "source-1",
        month: 6,
        tenantId: "tenant-1",
        year: 2026,
      },
      prisma,
    )

    expect(prisma.batchRowCreates).toHaveLength(0)
  })

  test("updates selected rows as collected or exception before posting", async () => {
    const prisma = createCollectionSourceBatchPrismaStub({
      existingRowCount: 2,
    })

    await updateCollectionSourceContributionBatchRows(
      {
        actorUserId: "user-1",
        batchId: "batch-1",
        rows: [
          {
            paidAmount: 35000,
            rowId: "row-1",
            status: "collected",
          },
          {
            exceptionReason: "Deduction not released",
            rowId: "row-2",
            status: "exception",
          },
        ],
        tenantId: "tenant-1",
      },
      prisma,
    )

    expect(prisma.batchRowUpdates[0].data).toMatchObject({
      paidAmount: 35000,
      status: "collected",
    })
    expect(prisma.batchRowUpdates[1].data).toMatchObject({
      exceptionReason: "Deduction not released",
      paidAmount: 0,
      status: "exception",
    })
    expect(prisma.auditCreates.at(-1).data.action).toBe(
      "collection_source_batch.rows_updated",
    )
  })

  test("posts only selected collected rows through normal contribution records", async () => {
    const prisma = createCollectionSourceBatchPrismaStub({
      existingRowCount: 2,
    })
    prisma.rowStore[0].status = "collected"
    prisma.rowStore[0].paidAmount = 35000
    prisma.rowStore[1].status = "exception"
    prisma.rowStore[1].paidAmount = 0

    await postCollectionSourceContributionBatchRows(
      {
        actorUserId: "user-1",
        batchId: "batch-1",
        rowIds: ["row-1"],
        tenantId: "tenant-1",
      },
      prisma,
    )

    expect(prisma.contributionCreates).toHaveLength(1)
    expect(prisma.contributionCreates[0].data).toMatchObject({
      amount: 35000,
      channel: "payroll",
      committedAmount: 35000,
      contributionPlanId: "plan-1",
      memberId: "member-1",
      periodLabel: "June 2026",
      status: "posted",
      tenantId: "tenant-1",
    })
    expect(prisma.batchRowUpdates[0].data).toMatchObject({
      contributionId: "contribution-1",
      paidAmount: 35000,
      status: "posted",
    })
    expect(prisma.auditCreates.at(-1).data.action).toBe(
      "collection_source_batch.posted",
    )
  })

  test("blocks staging when the operation profile disables batch posting", async () => {
    const prisma = createCollectionSourceBatchPrismaStub({
      serviceMode: "disabled",
    })

    await expect(
      stageCollectionSourceContributionBatch(
        {
          actorUserId: "user-1",
          deductionSourceId: "source-1",
          month: 6,
          tenantId: "tenant-1",
          year: 2026,
        },
        prisma,
      ),
    ).rejects.toThrow("Collection Source batch posting is not enabled")

    expect(prisma.batchRowCreates).toHaveLength(0)
  })
})
