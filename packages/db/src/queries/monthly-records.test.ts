import { describe, expect, test } from "bun:test"
import {
  applyMonthlyRecordMember,
  cancelMonthlyRecordMember,
  ensureMonthlyRecord,
  getMonthlyRecordDetail,
  getOrCreateMonthlyRecordsPageData,
} from "./monthly-records"

function createLockedMonthlyRecordPrismaStub({
  initialMigrationStatus = "historical_setup_in_progress",
}: {
  initialMigrationStatus?: string
} = {}) {
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
    chargeDefinition: {
      findFirst: async () => null,
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
          memberRows: [],
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
        initialMigrationStatus,
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt:
          initialMigrationStatus === "live_operations"
            ? new Date("2025-02-01T00:00:00.000Z")
            : null,
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

  test("monthly record seeding selects the latest period-effective commitment history row", async () => {
    const prisma = createLockedMonthlyRecordPrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await getMonthlyRecordDetail(
      "tenant-1",
      "monthly-record-1",
      prisma as never,
    )

    expect(prisma.seedMemberLookups).toHaveLength(1)
    const lookup = prisma.seedMemberLookups[0] as {
      include: {
        contributionPlans: {
          orderBy: unknown
          take: number
          where: Record<string, unknown>
        }
      }
    }

    expect(lookup.include.contributionPlans.where).toMatchObject({
      interval: "monthly",
      startsAt: { lt: new Date("2026-02-01T00:00:00.000Z") },
      OR: [
        { endsAt: null },
        { endsAt: { gte: new Date("2026-01-01T00:00:00.000Z") } },
      ],
    })
    expect(lookup.include.contributionPlans.where).not.toHaveProperty(
      "isActive",
    )
    expect(lookup.include.contributionPlans.orderBy).toEqual({
      startsAt: "desc",
    })
    expect(lookup.include.contributionPlans.take).toBe(1)
  })
})
