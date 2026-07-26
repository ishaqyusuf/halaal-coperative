import { describe, expect, test } from "bun:test"
import {
  closeContributionPlan,
  listContributions,
  recordContribution,
  recordMemberPayment,
  setMemberContributionPlan,
  settleSupportCaseSpecialSavingsRefund,
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

  test("posts an approved support refund against special savings and resolves the case", async () => {
    const livePrisma = createLiveContributionPolicyPrismaStub()
    const auditCreates: Array<Record<string, any>> = []
    const caseUpdates: Array<Record<string, any>> = []
    const ledgerCreates: Array<Record<string, any>> = []
    const memberUpdates: Array<Record<string, any>> = []
    const withdrawalCreates: Array<Record<string, any>> = []
    const tx = {
      ...livePrisma,
      auditLog: {
        ...livePrisma.auditLog,
        create: async (args: Record<string, any>) => {
          auditCreates.push(args)
          return args.data
        },
      },
      contribution: {
        aggregate: async () => ({
          _sum: { extraSavingsAmount: 50000 },
        }),
      },
      ledgerTransaction: {
        create: async (args: Record<string, any>) => {
          ledgerCreates.push(args)
          return { id: "ledger-1", entries: args.data.entries.create }
        },
      },
      member: {
        ...livePrisma.member,
        findFirst: async () => ({
          id: "member-1",
          totalSavingsSnapshot: 150000,
        }),
        update: async (args: Record<string, any>) => {
          memberUpdates.push(args)
          return args.data
        },
      },
      memberOpeningBalance: {
        aggregate: async () => ({
          _sum: { specialSavingsBalance: 0 },
        }),
      },
      memberSpecialSavingsWithdrawal: {
        aggregate: async () => ({ _sum: { amount: 0 } }),
        create: async (args: Record<string, any>) => {
          withdrawalCreates.push(args)
          return { id: "withdrawal-1", ...args.data }
        },
      },
      supportCase: {
        findFirst: async () => ({
          financialAdjustmentApprovalStatus: "approved",
          id: "case-1",
          memberId: "member-1",
          moneyImpactRequested: true,
          requiresFinancialAdjustment: true,
          specialSavingsWithdrawal: null,
          status: "in_progress",
        }),
        update: async (args: Record<string, any>) => {
          caseUpdates.push(args)
          return args.data
        },
      },
      user: {
        findFirst: async () => ({ id: "user-1" }),
      },
    }
    const prisma = {
      ...livePrisma,
      $transaction: async (
        callback: (transactionClient: typeof tx) => Promise<unknown>,
      ) => callback(tx),
      ledgerAccount: {
        findUnique: async (args: Record<string, any>) => ({
          id:
            args.where.tenantId_code.code === "1000"
              ? "savings-account"
              : "cash-account",
        }),
      },
    }

    const withdrawal = await settleSupportCaseSpecialSavingsRefund(
      {
        actorUserId: "user-1",
        amount: 50000,
        notes: "Refund sent to the member.",
        paidAt: new Date("2026-07-23T00:00:00.000Z"),
        reference: "ACAC-REFUND-001",
        supportCaseId: "case-1",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(withdrawal.id).toBe("withdrawal-1")
    expect(ledgerCreates[0]?.data.entries.create).toEqual([
      {
        amount: 50000,
        direction: "debit",
        ledgerAccountId: "savings-account",
        tenantId: "tenant-1",
      },
      {
        amount: 50000,
        direction: "credit",
        ledgerAccountId: "cash-account",
        tenantId: "tenant-1",
      },
    ])
    expect(withdrawalCreates[0]?.data.ledgerTransactionId).toBe("ledger-1")
    expect(memberUpdates[0]?.data.totalSavingsSnapshot).toEqual({
      decrement: 50000,
    })
    expect(caseUpdates[0]?.data).toMatchObject({
      resolutionSummary: "Refund sent to the member.",
      status: "resolved",
    })
    expect(auditCreates[0]?.data).toMatchObject({
      action: "special_savings.refund_posted",
      entityId: "withdrawal-1",
      entityType: "MemberSpecialSavingsWithdrawal",
    })
  })

  test("blocks a support refund until the financial adjustment is approved", async () => {
    const livePrisma = createLiveContributionPolicyPrismaStub()
    const tx = {
      ...livePrisma,
      supportCase: {
        findFirst: async () => ({
          financialAdjustmentApprovalStatus: "pending",
          id: "case-1",
          memberId: "member-1",
          moneyImpactRequested: true,
          requiresFinancialAdjustment: true,
          specialSavingsWithdrawal: null,
          status: "in_progress",
        }),
      },
      user: {
        findFirst: async () => ({ id: "user-1" }),
      },
    }
    const prisma = {
      ...livePrisma,
      $transaction: async (
        callback: (transactionClient: typeof tx) => Promise<unknown>,
      ) => callback(tx),
      ledgerAccount: {
        findUnique: async (args: Record<string, any>) => ({
          id:
            args.where.tenantId_code.code === "1000"
              ? "savings-account"
              : "cash-account",
        }),
      },
    }

    await expect(
      settleSupportCaseSpecialSavingsRefund(
        {
          actorUserId: "user-1",
          amount: 50000,
          paidAt: new Date("2026-07-23T00:00:00.000Z"),
          reference: "ACAC-REFUND-001",
          supportCaseId: "case-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Approved financial adjustment review is required")
  })
})
