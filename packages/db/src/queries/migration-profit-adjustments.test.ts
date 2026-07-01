import { describe, expect, test } from "bun:test"
import {
  listMigrationProfitAdjustmentOptions,
  upsertMigrationProfitAdjustment,
} from "./migration-profit-adjustments"

function createProfitAdjustmentPrismaStub({
  appliedBackfillMonths = 0,
  initialMigrationStatus = "historical_setup_in_progress",
}: {
  appliedBackfillMonths?: number
  initialMigrationStatus?: string
} = {}) {
  const auditLogCreates: unknown[] = []
  const adjustmentUpserts: unknown[] = []

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
      findFirst: async () => ({
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
      }),
      findMany: async () => [
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
      ],
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

describe("migration profit adjustments", () => {
  test("lists profit entries with disbursed and available amounts", async () => {
    const options = await listMigrationProfitAdjustmentOptions(
      "tenant-1",
      createProfitAdjustmentPrismaStub() as never,
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
        memberPublishedAllocationAmount: 0,
        profitAmount: 100000,
        profitDate: new Date("2025-04-30T00:00:00.000Z"),
        totalDisbursedAmount: 14000,
      },
    ])
  })

  test("lists the selected member's existing migration profit allocation", async () => {
    const options = await listMigrationProfitAdjustmentOptions(
      "tenant-1",
      createProfitAdjustmentPrismaStub() as never,
      "member-1",
    )

    expect(options[0]).toMatchObject({
      availableAmount: 66000,
      editableAvailableAmount: 70000,
      memberAllocatedAmount: 4000,
      memberMigrationAdjustmentAmount: 4000,
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
      prisma as never,
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

  test("blocks profit adjustment edits after migration finalization", async () => {
    const prisma = createProfitAdjustmentPrismaStub({
      initialMigrationStatus: "finalized",
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
        prisma as never,
      ),
    ).rejects.toThrow("Migration adjustments are locked")

    expect(prisma.adjustmentUpserts).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
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
        prisma as never,
      ),
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
        createProfitAdjustmentPrismaStub() as never,
      ),
    ).rejects.toThrow("Set either a member profit amount or a share percentage, not both.")
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
        createProfitAdjustmentPrismaStub() as never,
      ),
    ).rejects.toThrow("Member profit adjustment cannot exceed the remaining available profit amount.")
  })
})
