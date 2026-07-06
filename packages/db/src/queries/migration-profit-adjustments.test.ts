import { describe, expect, test } from "bun:test"
import {
  listMigrationProfitAdjustmentOptions,
  saveMigrationProfitSeasonAdjustments,
  upsertMigrationProfitAdjustment,
} from "./migration-profit-adjustments"

function createProfitAdjustmentPrismaStub({
  appliedBackfillMonths = 0,
  initialMigrationStatus = "historical_setup_in_progress",
  profitEntries,
}: {
  appliedBackfillMonths?: number
  initialMigrationStatus?: string
  profitEntries?: any[]
} = {}) {
  const auditLogCreates: unknown[] = []
  const adjustmentUpserts: unknown[] = []
  const shareBusinessProfitEntries = profitEntries ?? [
    {
      allocations: [{ allocatedProfitAmount: 10000 }],
      allocatableProfitAmount: 80000,
      expenseAmount: 20000,
      id: "profit-1",
      migrationProfitAdjustments: [
        {
          allocatedProfitAmount: null,
          memberId: "member-1",
          sharePercentage: 5,
        },
      ],
      profitAmount: 100000,
      profitDate: new Date("2025-04-30T00:00:00.000Z"),
      shareBusiness: {
        name: "Retail pool",
      },
    },
  ]

  return {
    appliedBackfillMonth: {
      findMany: async (input?: unknown) => {
        if (
          input &&
          typeof input === "object" &&
          "take" in input &&
          appliedBackfillMonths > 0
        ) {
          return [{ id: "applied-month-1" }]
        }

        return []
      },
    },
    auditLog: {
      count: async () => 0,
      create: async (input: unknown) => {
        auditLogCreates.push(input)
        return input
      },
    },
    auditLogCreates,
    adjustmentUpserts,
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
      findMany: async () => [],
    },
    migrationProfitAdjustment: {
      upsert: async (input: any) => {
        adjustmentUpserts.push(input)
        return { id: "adjustment-1", ...input.create }
      },
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
      findFirst: async (input?: any) => {
        const entryId = input?.where?.id
        const entry =
          shareBusinessProfitEntries.find((row) => row.id === entryId) ??
          shareBusinessProfitEntries[0]

        return entry
      },
      findMany: async () => shareBusinessProfitEntries,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus,
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt:
          initialMigrationStatus === "finalized" ||
          initialMigrationStatus === "live_operations"
            ? new Date("2026-01-31T00:00:00.000Z")
            : null,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
  }
}

function createSeasonProfitEntries() {
  const linkedDividendPeriod = {
    id: "season-1",
    name: "Yearly dividend 2025",
    periodEnd: new Date("2025-12-31T00:00:00.000Z"),
    periodStart: new Date("2025-01-01T00:00:00.000Z"),
    status: "approved",
  }

  return [
    {
      allocations: [],
      allocatableProfitAmount: 100,
      expenseAmount: 0,
      id: "profit-1",
      linkedDividendPeriod,
      migrationProfitAdjustments: [],
      profitAmount: 100,
      profitDate: new Date("2025-03-31T00:00:00.000Z"),
      shareBusiness: {
        name: "Retail pool",
      },
    },
    {
      allocations: [],
      allocatableProfitAmount: 200,
      expenseAmount: 0,
      id: "profit-2",
      linkedDividendPeriod,
      migrationProfitAdjustments: [],
      profitAmount: 200,
      profitDate: new Date("2025-09-30T00:00:00.000Z"),
      shareBusiness: {
        name: "Transport pool",
      },
    },
  ]
}

describe("migration profit adjustments", () => {
  test("lists profit entries with disbursed and available amounts", async () => {
    const options = await listMigrationProfitAdjustmentOptions(
      "tenant-1",
      createProfitAdjustmentPrismaStub() as never
    )

    expect(options).toEqual([
      {
        allocatableProfitAmount: 80000,
        availableAmount: 66000,
        businessName: "Retail pool",
        editableAvailableAmount: 66000,
        expenseAmount: 20000,
        id: "profit-1",
        memberAllocatedAmount: 0,
        memberMigrationAdjustmentAmount: 0,
        memberMigrationAdjustmentSharePercentage: null,
        memberPublishedAllocationAmount: 0,
        profitAmount: 100000,
        profitDate: new Date("2025-04-30T00:00:00.000Z"),
        seasonLabel: null,
        seasonKey: "profit-entry:profit-1",
        seasonPeriodStart: null,
        seasonPeriodEnd: null,
        seasonStatus: null,
        totalDisbursedAmount: 14000,
      },
    ])
  })

  test("lists the selected member's existing migration profit allocation", async () => {
    const options = await listMigrationProfitAdjustmentOptions(
      "tenant-1",
      createProfitAdjustmentPrismaStub() as never,
      "member-1"
    )

    expect(options[0]).toMatchObject({
      availableAmount: 66000,
      editableAvailableAmount: 70000,
      memberAllocatedAmount: 4000,
      memberMigrationAdjustmentAmount: 4000,
      memberMigrationAdjustmentSharePercentage: 5,
      memberPublishedAllocationAmount: 0,
      totalDisbursedAmount: 14000,
    })
  })

  test("upserts and audits a member profit amount adjustment", async () => {
    const prisma = createProfitAdjustmentPrismaStub()

    await upsertMigrationProfitAdjustment(
      {
        actorUserId: "user-1",
        allocatedProfitAmount: 15000,
        memberId: "member-1",
        profitEntryId: "profit-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.adjustmentUpserts[0]).toMatchObject({
      create: {
        allocatedProfitAmount: 15000,
        memberId: "member-1",
        profitEntryId: "profit-1",
        sharePercentage: null,
        tenantId: "tenant-1",
      },
    })
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.profit_adjustment.upserted",
        entityId: "adjustment-1",
        entityType: "MigrationProfitAdjustment",
      },
    })
  })

  test("allows profit adjustment edits after setup finalization before member backfill is applied", async () => {
    const prisma = createProfitAdjustmentPrismaStub({
      initialMigrationStatus: "finalized",
    })

    await upsertMigrationProfitAdjustment(
      {
        actorUserId: "user-1",
        allocatedProfitAmount: 15000,
        memberId: "member-1",
        profitEntryId: "profit-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.adjustmentUpserts).toHaveLength(1)
    expect(prisma.auditLogCreates).toHaveLength(1)
  })

  test("splits a season amount proportionally across profit entries", async () => {
    const prisma = createProfitAdjustmentPrismaStub({
      profitEntries: createSeasonProfitEntries(),
    })

    await saveMigrationProfitSeasonAdjustments(
      {
        actorUserId: "user-1",
        memberId: "member-1",
        seasons: [
          {
            allocatedProfitAmount: 150,
            key: "season:season-1",
          },
        ],
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.adjustmentUpserts).toHaveLength(2)
    expect(prisma.adjustmentUpserts).toMatchObject([
      {
        create: {
          allocatedProfitAmount: 50,
          memberId: "member-1",
          profitEntryId: "profit-1",
          sharePercentage: null,
        },
      },
      {
        create: {
          allocatedProfitAmount: 100,
          memberId: "member-1",
          profitEntryId: "profit-2",
          sharePercentage: null,
        },
      },
    ])
  })

  test("copies a season share percentage to every profit entry", async () => {
    const prisma = createProfitAdjustmentPrismaStub({
      profitEntries: createSeasonProfitEntries(),
    })

    await saveMigrationProfitSeasonAdjustments(
      {
        actorUserId: "user-1",
        memberId: "member-1",
        seasons: [
          {
            key: "season:season-1",
            sharePercentage: 12.5,
          },
        ],
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.adjustmentUpserts).toMatchObject([
      {
        create: {
          allocatedProfitAmount: null,
          profitEntryId: "profit-1",
          sharePercentage: 12.5,
        },
      },
      {
        create: {
          allocatedProfitAmount: null,
          profitEntryId: "profit-2",
          sharePercentage: 12.5,
        },
      },
    ])
  })

  test("rejects a season row with both amount and share percentage", async () => {
    await expect(
      saveMigrationProfitSeasonAdjustments(
        {
          actorUserId: "user-1",
          memberId: "member-1",
          seasons: [
            {
              allocatedProfitAmount: 100,
              key: "season:season-1",
              sharePercentage: 10,
            },
          ],
          tenantId: "tenant-1",
        },
        createProfitAdjustmentPrismaStub({
          profitEntries: createSeasonProfitEntries(),
        }) as never
      )
    ).rejects.toThrow(
      "Set either a member profit amount or a share percentage, not both."
    )
  })

  test("rejects a season amount above the editable season amount", async () => {
    await expect(
      saveMigrationProfitSeasonAdjustments(
        {
          actorUserId: "user-1",
          memberId: "member-1",
          seasons: [
            {
              allocatedProfitAmount: 350,
              key: "season:season-1",
            },
          ],
          tenantId: "tenant-1",
        },
        createProfitAdjustmentPrismaStub({
          profitEntries: createSeasonProfitEntries(),
        }) as never
      )
    ).rejects.toThrow("remaining available season profit")
  })

  test("allows season adjustment edits after setup finalization before member backfill is applied", async () => {
    const prisma = createProfitAdjustmentPrismaStub({
      initialMigrationStatus: "finalized",
      profitEntries: createSeasonProfitEntries(),
    })

    await saveMigrationProfitSeasonAdjustments(
      {
        actorUserId: "user-1",
        memberId: "member-1",
        seasons: [
          {
            allocatedProfitAmount: 150,
            key: "season:season-1",
          },
        ],
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.adjustmentUpserts).toHaveLength(2)
  })

  test("blocks profit adjustment edits after the member ledger is applied", async () => {
    const prisma = createProfitAdjustmentPrismaStub({
      appliedBackfillMonths: 1,
    })

    await expect(
      upsertMigrationProfitAdjustment(
        {
          actorUserId: "user-1",
          allocatedProfitAmount: 15000,
          memberId: "member-1",
          profitEntryId: "profit-1",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("historical ledger has already been applied")

    expect(prisma.adjustmentUpserts).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })

  test("requires a single allocation method", async () => {
    await expect(
      upsertMigrationProfitAdjustment(
        {
          actorUserId: "user-1",
          allocatedProfitAmount: 25000,
          memberId: "member-1",
          profitEntryId: "profit-1",
          sharePercentage: 10,
          tenantId: "tenant-1",
        },
        createProfitAdjustmentPrismaStub() as never
      )
    ).rejects.toThrow(
      "Set either a member profit amount or a share percentage, not both."
    )
  })

  test("rejects profit adjustments above the remaining available profit", async () => {
    await expect(
      upsertMigrationProfitAdjustment(
        {
          actorUserId: "user-1",
          allocatedProfitAmount: 25000,
          memberId: "member-1",
          profitEntryId: "profit-1",
          tenantId: "tenant-1",
        },
        createProfitAdjustmentPrismaStub({
          profitEntries: [
            {
              allocations: [{ allocatedProfitAmount: 10000 }],
              allocatableProfitAmount: 80000,
              id: "profit-1",
              migrationProfitAdjustments: [
                {
                  allocatedProfitAmount: 50000,
                  memberId: "member-2",
                  sharePercentage: null,
                },
              ],
              profitAmount: 100000,
            },
          ],
        }) as never
      )
    ).rejects.toThrow(
      "Member profit adjustment cannot exceed the remaining available profit amount."
    )
  })
})
