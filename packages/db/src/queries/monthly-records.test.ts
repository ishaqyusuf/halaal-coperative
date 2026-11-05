import { describe, expect, test } from "bun:test"
import {
  applyMonthlyRecordMember,
  cancelMonthlyRecordMember,
  ensureMonthlyRecord,
  generateDueMonthlyRecords,
  getMonthlyRecordDetail,
  getOrCreateMonthlyRecordsPageData,
  selectDueMonthlyRecordTenants,
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

describe("scheduled monthly record generation cost", () => {
  test("selects due tenants from settings with defaults for missing rows", () => {
    expect(
      selectDueMonthlyRecordTenants({
        dayOfMonth: 10,
        settings: [
          { autoGenerateEnabled: false, generationDayOfMonth: 1, tenantId: "off" },
          { autoGenerateEnabled: true, generationDayOfMonth: 15, tenantId: "later" },
          { autoGenerateEnabled: true, generationDayOfMonth: 10, tenantId: "today" },
        ],
        tenantIds: ["off", "later", "today", "no-row"],
      })
    ).toEqual({
      due: ["today", "no-row"],
      skipped: [
        { reason: "disabled", tenantId: "off" },
        { reason: "not_due", tenantId: "later" },
      ],
    })
  })

  test("reads settings once and never upserts them when nothing is due", async () => {
    const settingReads: unknown[] = []
    const settingUpserts: unknown[] = []
    const prisma = {
      monthlyRecordSetting: {
        findMany: async (args: unknown) => {
          settingReads.push(args)
          return [
            { autoGenerateEnabled: false, generationDayOfMonth: 1, tenantId: "a" },
            { autoGenerateEnabled: true, generationDayOfMonth: 20, tenantId: "b" },
          ]
        },
        upsert: async (args: unknown) => {
          settingUpserts.push(args)
          throw new Error("settings must not be upserted by the scheduler")
        },
      },
      tenant: {
        findMany: async () => [{ id: "a" }, { id: "b" }],
      },
    }

    const result = await generateDueMonthlyRecords(
      { actorUserId: "system", now: new Date("2026-11-05T00:00:00.000Z") },
      prisma as never
    )

    expect(settingReads).toHaveLength(1)
    expect(settingUpserts).toHaveLength(0)
    expect(result.generated).toEqual([])
    expect(result.skipped).toEqual([
      { reason: "disabled", tenantId: "a" },
      { reason: "not_due", tenantId: "b" },
    ])
  })

  test("stops after the tenant query when no tenant is live", async () => {
    let settingReads = 0
    const result = await generateDueMonthlyRecords(
      { actorUserId: "system" },
      {
        monthlyRecordSetting: {
          findMany: async () => {
            settingReads += 1
            return []
          },
        },
        tenant: { findMany: async () => [] },
      } as never
    )

    expect(settingReads).toBe(0)
    expect(result).toEqual({ generated: [], skipped: [] })
  })
})
