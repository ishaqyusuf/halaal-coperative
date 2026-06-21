import { describe, expect, test } from "bun:test"
import {
  applyMonthlyRecordMember,
  cancelMonthlyRecordMember,
  ensureMonthlyRecord,
  getMonthlyRecordDetail,
  getOrCreateMonthlyRecordsPageData,
} from "./monthly-records"

function createLockedMonthlyRecordPrismaStub() {
  const monthlyRecordUpserts: unknown[] = []
  const monthlyRecordMemberLookups: unknown[] = []
  const monthlyRecordDetailLoads: unknown[] = []
  const seedMemberLookups: unknown[] = []
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
    },
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
      findMany: async (input: unknown) => {
        if (
          input &&
          typeof input === "object" &&
          "include" in input
        ) {
          seedMemberLookups.push(input)
        }

        return []
      },
    },
    monthlyRecord: {
      findFirst: async (input: unknown) => {
        if (
          input &&
          typeof input === "object" &&
          "include" in input
        ) {
          monthlyRecordDetailLoads.push(input)
        }

        return {
          id: "monthly-record-1",
          periodLabel: "January 2026",
          periodMonth: 1,
          periodYear: 2026,
          status: "open",
        }
      },
      findMany: async () => [],
      upsert: async (input: unknown) => {
        monthlyRecordUpserts.push(input)

        return {
          id: "monthly-record-1",
        }
      },
    },
    monthlyRecordMember: {
      findFirst: async (input: unknown) => {
        monthlyRecordMemberLookups.push(input)

        return null
      },
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "historical_setup_in_progress",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: null,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
    monthlyRecordDetailLoads,
    monthlyRecordMemberLookups,
    monthlyRecordUpserts,
    seedMemberLookups,
    transactions,
  }
}

describe("monthly record live write guards", () => {
  test("blocks monthly record creation before live operations", async () => {
    const prisma = createLockedMonthlyRecordPrismaStub()

    await expect(
      ensureMonthlyRecord(
        {
          actorUserId: "user-1",
          month: 1,
          tenantId: "tenant-1",
          year: 2026,
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.monthlyRecordUpserts).toHaveLength(0)
    expect(prisma.seedMemberLookups).toHaveLength(0)
  })

  test("blocks monthly record auto-creation from page data before live operations", async () => {
    const prisma = createLockedMonthlyRecordPrismaStub()

    await expect(
      getOrCreateMonthlyRecordsPageData(
        {
          actorUserId: "user-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.monthlyRecordUpserts).toHaveLength(0)
  })

  test("blocks detail reseeding before live operations", async () => {
    const prisma = createLockedMonthlyRecordPrismaStub()

    await expect(
      getMonthlyRecordDetail(
        "tenant-1",
        "monthly-record-1",
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.seedMemberLookups).toHaveLength(0)
    expect(prisma.monthlyRecordDetailLoads).toHaveLength(0)
  })

  test("blocks monthly record application before live operations", async () => {
    const prisma = createLockedMonthlyRecordPrismaStub()

    await expect(
      applyMonthlyRecordMember(
        {
          actorUserId: "user-1",
          monthlyRecordMemberId: "monthly-record-member-1",
          tenantId: "tenant-1",
          totalPaidAmount: 5000,
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.monthlyRecordMemberLookups).toHaveLength(0)
  })

  test("blocks monthly record cancellation before live operations", async () => {
    const prisma = createLockedMonthlyRecordPrismaStub()

    await expect(
      cancelMonthlyRecordMember(
        {
          actorUserId: "user-1",
          monthlyRecordMemberId: "monthly-record-member-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.transactions).toHaveLength(0)
  })
})
