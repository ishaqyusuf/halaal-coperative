import { describe, expect, test } from "bun:test"
import {
  addBackfillActivity,
  applyBackfillBatch,
  createBackfillBatch,
  generateBackfillBatch,
  saveBackfillDraft,
  upsertMemberAmountLog,
  updateBackfillBatchStatus,
  updateBackfillMonthRow,
} from "./backfill"

function createFinalizedBackfillPrismaStub({
  initialMigrationStatus = "finalized",
}: {
  initialMigrationStatus?: string
} = {}) {
  const activityCreates: unknown[] = []
  const auditLogCreates: unknown[] = []
  const batchCreates: unknown[] = []
  const batchUpdates: unknown[] = []
  const memberAmountLogCreates: unknown[] = []
  const monthRowUpdates: unknown[] = []
  const transactions: unknown[] = []

  return {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      transactions.push(callback)

      return callback({})
    },
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
      create: async (input: unknown) => {
        auditLogCreates.push(input)

        return input
      },
    },
    backfillActivity: {
      create: async (input: unknown) => {
        activityCreates.push(input)

        return input
      },
    },
    backfillBatch: {
      count: async () => 0,
      create: async (input: unknown) => {
        batchCreates.push(input)

        return input
      },
      findMany: async () => [],
      update: async (input: unknown) => {
        batchUpdates.push(input)

        return input
      },
    },
    backfillMonthRow: {
      update: async (input: unknown) => {
        monthRowUpdates.push(input)

        return input
      },
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
    memberAmountLog: {
      create: async (input: any) => {
        memberAmountLogCreates.push(input)

        return { id: "amount-log-1", ...input.data }
      },
      findFirst: async () => null,
      update: async (input: any) => ({ id: "amount-log-1", ...input.data }),
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus,
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
    activityCreates,
    auditLogCreates,
    batchCreates,
    batchUpdates,
    memberAmountLogCreates,
    monthRowUpdates,
    transactions,
  }
}

describe("backfill migration lifecycle guards", () => {
  test("blocks backfill batch creation after migration finalization", async () => {
    const prisma = createFinalizedBackfillPrismaStub()

    await expect(
      createBackfillBatch(
        {
          memberId: "member-1",
          rangeEnd: new Date("2025-03-01T00:00:00.000Z"),
          rangeStart: new Date("2025-01-01T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member ledger backfill is locked")

    expect(prisma.batchCreates).toHaveLength(0)
  })

  test("blocks generated draft saves after migration finalization", async () => {
    const prisma = createFinalizedBackfillPrismaStub()

    await expect(
      saveBackfillDraft(
        {
          actorUserId: "user-1",
          draft: {} as never,
          draftInput: {} as never,
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member ledger backfill is locked")

    expect(prisma.transactions).toHaveLength(0)
  })

  test("allows member amount history during live operations before member backfill is applied", async () => {
    const prisma = createFinalizedBackfillPrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await upsertMemberAmountLog(
      {
        actorUserId: "user-1",
        amount: 2500,
        effectiveFrom: new Date("2025-08-01T00:00:00.000Z"),
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.memberAmountLogCreates).toHaveLength(1)
    expect(prisma.memberAmountLogCreates[0]).toMatchObject({
      data: {
        amount: 2500,
        memberId: "member-1",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.auditLogCreates).toHaveLength(1)
  })

  test("blocks backfill application after migration finalization", async () => {
    const prisma = createFinalizedBackfillPrismaStub()

    await expect(
      applyBackfillBatch(
        {
          actorUserId: "user-1",
          batchId: "batch-1",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member ledger backfill is locked")

    expect(prisma.transactions).toHaveLength(0)
  })

  test("blocks backfill generation after migration finalization", async () => {
    const prisma = createFinalizedBackfillPrismaStub()

    await expect(
      generateBackfillBatch(
        {
          actorUserId: "user-1",
          batchId: "batch-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member ledger backfill is locked")

    expect(prisma.transactions).toHaveLength(0)
  })

  test("blocks backfill row edits after migration finalization", async () => {
    const prisma = createFinalizedBackfillPrismaStub()

    await expect(
      updateBackfillMonthRow(
        {
          amount: 1000,
          monthRowId: "month-row-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member ledger backfill is locked")

    expect(prisma.monthRowUpdates).toHaveLength(0)
  })

  test("blocks backfill activities after migration finalization", async () => {
    const prisma = createFinalizedBackfillPrismaStub()

    await expect(
      addBackfillActivity(
        {
          activityDate: new Date("2025-02-01T00:00:00.000Z"),
          activityType: "manual_adjustment",
          amount: 1000,
          batchId: "batch-1",
          monthRowId: "month-row-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member ledger backfill is locked")

    expect(prisma.activityCreates).toHaveLength(0)
  })

  test("blocks backfill status updates after migration finalization", async () => {
    const prisma = createFinalizedBackfillPrismaStub()

    await expect(
      updateBackfillBatchStatus(
        {
          batchId: "batch-1",
          status: "approved",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member ledger backfill is locked")

    expect(prisma.batchUpdates).toHaveLength(0)
  })
})
