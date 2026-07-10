import { describe, expect, test } from "bun:test"
import {
  closeContributionPlan,
  listContributions,
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

function createLiveContributionPolicyPrismaStub(input?: {
  activeFinancingCount?: number
  activeFoodPurchaseCount?: number
  activeProcurementCount?: number
  foodPurchaseAllowsCommitmentReductionDuringPayback?: boolean
  procurementAllowsCommitmentReductionDuringPayback?: boolean
  strictCommitmentDuringFinancing?: boolean
}) {
  const auditCreates: unknown[] = []
  const planUpdates: unknown[] = []
  const transactions: unknown[] = []
  const tx = {
    auditLog: {
      create: async (args: unknown) => {
        auditCreates.push(args)
        return args
      },
    },
    contributionPlan: {
      findFirst: async () => ({
        amount: 50000,
        isActive: true,
        memberId: "member-1",
      }),
      update: async (args: unknown) => {
        planUpdates.push(args)
        return {
          amount: 30000,
          id: "plan-1",
          memberId: "member-1",
        }
      },
    },
    loan: {
      count: async () => input?.activeFinancingCount ?? 0,
    },
    foodPurchaseApplication: {
      count: async () => input?.activeFoodPurchaseCount ?? 0,
    },
    procurementRequest: {
      count: async () => input?.activeProcurementCount ?? 0,
    },
    tenantPolicy: {
      findUnique: async () => ({
        foodPurchaseAllowsCommitmentReductionDuringPayback:
          input?.foodPurchaseAllowsCommitmentReductionDuringPayback ?? false,
        procurementAllowsCommitmentReductionDuringPayback:
          input?.procurementAllowsCommitmentReductionDuringPayback ?? false,
        strictCommitmentDuringFinancing:
          input?.strictCommitmentDuringFinancing ?? true,
      }),
    },
  }

  return {
    ...createLockedContributionPrismaStub(),
    $transaction: async (callback: (transactionClient: typeof tx) => Promise<unknown>) => {
      transactions.push(callback)
      return callback(tx)
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
    member: {
      findMany: async () => [],
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: new Date("2026-07-01T00:00:00.000Z"),
        startDate: new Date("2026-01-01T00:00:00.000Z"),
      }),
    },
    tenantPolicy: {
      findUnique: async () => ({ shareConfigurationMode: "unit_based" }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
    auditCreates,
    planUpdates,
    transactions,
  }
}

describe("contribution live write guards", () => {
  test("lists only special-savings contribution rows when requested", async () => {
    const reads: Record<string, unknown>[] = []
    const counts: Record<string, unknown>[] = []

    const result = await listContributions(
      "tenant-1",
      {
        page: 1,
        pageSize: 500,
        specialSavingsOnly: true,
      },
      {
        contribution: {
          count: async (input: Record<string, unknown>) => {
            counts.push(input)
            return 0
          },
          findMany: async (input: Record<string, unknown>) => {
            reads.push(input)
            return []
          },
        },
      } as never,
    )

    expect(result.items).toEqual([])
    expect(reads[0]).toMatchObject({
      take: 500,
      where: {
        extraSavingsAmount: { gt: 0 },
        tenantId: "tenant-1",
      },
    })
    expect(counts[0]).toMatchObject({
      where: {
        extraSavingsAmount: { gt: 0 },
        tenantId: "tenant-1",
      },
    })
  })

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

  test("blocks active commitment reduction while serving financing in strict mode", async () => {
    const prisma = createLiveContributionPolicyPrismaStub({
      activeFinancingCount: 1,
      strictCommitmentDuringFinancing: true,
    })

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
    ).rejects.toThrow("Strict commitment policy")

    expect(prisma.planUpdates).toHaveLength(0)
  })

  test("allows active commitment reduction when strict financing mode is disabled", async () => {
    const prisma = createLiveContributionPolicyPrismaStub({
      activeFinancingCount: 1,
      strictCommitmentDuringFinancing: false,
    })

    await updateContributionPlan(
      {
        actorUserId: "user-1",
        amount: 30000,
        planId: "plan-1",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.planUpdates).toHaveLength(1)
    expect(prisma.auditCreates).toHaveLength(1)
  })

  test("blocks active commitment reduction while serving fixed procurement payback", async () => {
    const prisma = createLiveContributionPolicyPrismaStub({
      activeProcurementCount: 1,
      procurementAllowsCommitmentReductionDuringPayback: false,
      strictCommitmentDuringFinancing: false,
    })

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
    ).rejects.toThrow("Procurement commitment policy is fixed")

    expect(prisma.planUpdates).toHaveLength(0)
  })

  test("blocks active commitment reduction while serving fixed Foodstuff Purchase", async () => {
    const prisma = createLiveContributionPolicyPrismaStub({
      activeFoodPurchaseCount: 1,
      foodPurchaseAllowsCommitmentReductionDuringPayback: false,
      strictCommitmentDuringFinancing: false,
    })

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
    ).rejects.toThrow("Foodstuff Purchase commitment policy is fixed")

    expect(prisma.planUpdates).toHaveLength(0)
  })

  test("allows active commitment reduction when no fixed product snapshots are active", async () => {
    const prisma = createLiveContributionPolicyPrismaStub({
      strictCommitmentDuringFinancing: false,
    })

    await updateContributionPlan(
      {
        actorUserId: "user-1",
        amount: 30000,
        planId: "plan-1",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.planUpdates).toHaveLength(1)
    expect(prisma.auditCreates).toHaveLength(1)
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
