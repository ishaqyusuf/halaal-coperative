import { describe, expect, test } from "bun:test"
import {
  closeContributionPlan,
  recordContribution,
  recordMemberPayment,
  setMemberContributionPlan,
  updateContributionPlan,
  updateMemberPaymentAllocationPreference,
} from "./contributions"

function createLockedContributionPrismaStub() {
  const ledgerLookups: unknown[] = []
  const memberLookups: unknown[] = []
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
      count: async () => 0,
    },
    ledgerAccount: {
      findUnique: async (input: unknown) => {
        ledgerLookups.push(input)
        return null
      },
    },
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loan: {
      count: async () => 0,
    },
    member: {
      findFirst: async (input: unknown) => {
        memberLookups.push(input)
        return null
      },
      findMany: async () => [],
    },
    shareBusinessProfitEntry: {
      count: async () => 0,
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
      count: async () => 0,
    },
    ledgerLookups,
    memberLookups,
    transactions,
  }
}

describe("contribution live write guards", () => {
  test("blocks contribution posting before live operations", async () => {
    const prisma = createLockedContributionPrismaStub()

    await expect(
      recordContribution(
        {
          actorUserId: "user-1",
          amount: 25000,
          channel: "manual",
          memberId: "member-1",
          postedAt: new Date("2025-02-01T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.ledgerLookups).toHaveLength(0)
  })

  test("blocks member payment posting before live operations", async () => {
    const prisma = createLockedContributionPrismaStub()

    await expect(
      recordMemberPayment(
        {
          actorUserId: "user-1",
          channel: "manual",
          committedSavingsAmount: 25000,
          memberId: "member-1",
          postedAt: new Date("2025-02-01T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberLookups).toHaveLength(0)
    expect(prisma.ledgerLookups).toHaveLength(0)
  })

  test("blocks contribution plan creation before live operations", async () => {
    const prisma = createLockedContributionPrismaStub()

    await expect(
      setMemberContributionPlan(
        {
          actorUserId: "user-1",
          amount: 25000,
          memberId: "member-1",
          startsAt: new Date("2025-02-01T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.transactions).toHaveLength(0)
  })

  test("blocks contribution plan updates before live operations", async () => {
    const prisma = createLockedContributionPrismaStub()

    await expect(
      updateContributionPlan(
        {
          actorUserId: "user-1",
          amount: 30000,
          planId: "plan-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.transactions).toHaveLength(0)
  })

  test("blocks contribution plan closure before live operations", async () => {
    const prisma = createLockedContributionPrismaStub()

    await expect(
      closeContributionPlan(
        {
          actorUserId: "user-1",
          endsAt: new Date("2025-02-28T00:00:00.000Z"),
          planId: "plan-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.transactions).toHaveLength(0)
  })

  test("blocks payment allocation preference updates before live operations", async () => {
    const prisma = createLockedContributionPrismaStub()

    await expect(
      updateMemberPaymentAllocationPreference(
        {
          actorUserId: "user-1",
          memberId: "member-1",
          preference: "savings_first",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.transactions).toHaveLength(0)
  })

  test("allows backfill contribution posting through the live-write guard", async () => {
    const prisma = createLockedContributionPrismaStub()

    await expect(
      recordContribution(
        {
          actorUserId: "user-1",
          amount: 25000,
          channel: "manual",
          memberId: "member-1",
          postedAt: new Date("2025-02-01T00:00:00.000Z"),
          sourceType: "backfill",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Ledger accounts not initialized")

    expect(prisma.ledgerLookups).toHaveLength(2)
  })

  test("allows import contribution posting through the live-write guard", async () => {
    const prisma = createLockedContributionPrismaStub()

    await expect(
      recordContribution(
        {
          actorUserId: "user-1",
          amount: 25000,
          channel: "manual",
          memberId: "member-1",
          postedAt: new Date("2025-02-01T00:00:00.000Z"),
          sourceType: "import",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Ledger accounts not initialized")

    expect(prisma.ledgerLookups).toHaveLength(2)
  })
})
