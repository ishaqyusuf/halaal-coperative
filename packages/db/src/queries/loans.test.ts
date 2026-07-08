import { describe, expect, test } from "bun:test"
import { disburseLoan, postRepayment, submitLoanRequest } from "./loans"

function createLockedLoanPrismaStub() {
  const ledgerLookups: unknown[] = []
  const memberLookups: unknown[] = []
  const loanLookups: unknown[] = []

  return {
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
      findFirst: async (input: unknown) => {
        loanLookups.push(input)
        return null
      },
    },
    loanProduct: {
      findFirst: async () => null,
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
    tenantPolicy: {
      findUnique: async () => null,
    },
    tenantShareStructureVersion: {
      count: async () => 0,
    },
    ledgerLookups,
    loanLookups,
    memberLookups,
  }
}

function createLiveLoanRequestPrismaStub(input?: {
  existingCycle?: { id: string; status: "closed" | "draft" | "open" | "paused" } | null
  existingLoanRequests?: Array<{
    amount: number
    loanType: "normal" | "quick"
    status:
      | "approved"
      | "cancelled"
      | "draft"
      | "expired"
      | "rejected"
      | "submitted"
      | "under_review"
  }>
  loanType?: "normal" | "quick"
}) {
  const chargeApplicationCreates: any[] = []
  const loanRequestCreates: any[] = []
  const existingCycle =
    input && "existingCycle" in input
      ? input.existingCycle
      : {
    id: "cycle-1",
    normalBudgetAmount: 70000,
    normalAllocationPercentage: 70,
    periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    periodStart: new Date("2026-07-01T00:00:00.000Z"),
    projectedCommitmentAmount: 100000,
    quickBudgetAmount: 30000,
    quickAllocationPercentage: 30,
    receivedContributionAmount: 100000,
    reserveBufferAmount: 0,
    status: "open" as const,
    totalCapacityAmount: 100000,
  }

  const tx = {
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
      create: async (input: unknown) => input,
    },
    backfillBatch: {
      count: async () => 0,
      findMany: async () => [],
    },
    chargeApplication: {
      create: async (input: any) => {
        chargeApplicationCreates.push(input)
        return {
          id: `charge-application-${chargeApplicationCreates.length}`,
          ...input.data,
        }
      },
      findFirst: async () => null,
    },
    chargeDefinition: {
      findFirst: async () => ({
        id: "loan-charge-1",
        isMonthlyLevy: false,
        name: "Loan application fee",
        purpose: "loan_fee",
      }),
      findMany: async () => [
        {
          appliesToLoanRequests: true,
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          id: "loan-charge-1",
          isActive: true,
          name: "Loan application fee",
          purpose: "loan_fee",
          versions: [
            {
              amount: 2500,
              chargeValueType: "fixed_amount",
              createdAt: new Date("2025-01-01T00:00:00.000Z"),
              effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
              kind: "fixed",
            },
          ],
        },
      ],
    },
    ledgerAccount: {
      findUnique: async (input: any) => ({
        id: `ledger-${input.where.tenantId_code.code}`,
      }),
    },
    ledgerTransaction: {
      create: async (input: unknown) => input,
    },
    chargeDefinitionVersion: {
      count: async () => 1,
    },
    financingCycle: {
      findUnique: async () => existingCycle,
    },
    loanApproval: {
      create: async (input: unknown) => input,
    },
    loan: {
      count: async () => 0,
      findMany: async () => [],
    },
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loanRequest: {
      create: async (input: any) => {
        loanRequestCreates.push(input)
        return {
          id: "loan-request-1",
          ...input.data,
        }
      },
      findMany: async () =>
        (input?.existingLoanRequests ?? []).map((request) => ({
          requestedAmount: request.amount,
          status: request.status,
          loanProduct: {
            loanType: request.loanType,
          },
        })),
    },
    member: {
      findMany: async () => [],
      update: async (input: unknown) => input,
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
  }

  return {
    ...createLockedLoanPrismaStub(),
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
    chargeApplicationCreates,
    contribution: {
      aggregate: async () => ({ _sum: { amount: 250000 } }),
    },
    contributionPlan: {
      aggregate: async () => ({ _sum: { amount: 100000 } }),
    },
    financingCycle: {
      findUnique: async () => existingCycle,
    },
    loan: {
      aggregate: async () => ({ _sum: { outstandingPrincipal: 0 } }),
      count: async () => 0,
      findMany: async () => [],
    },
    loanProduct: {
      findFirst: async () => ({
        id: "product-1",
        isActive: true,
        loanType: input?.loanType ?? "quick",
        maxSavingsMultiple: 2,
        termMonths: 12,
      }),
    },
    loanRequest: {
      findMany: async () =>
        (input?.existingLoanRequests ?? []).map((request) => ({
          requestedAmount: request.amount,
          status: request.status,
          loanProduct: {
            loanType: request.loanType,
          },
        })),
    },
    loanRequestCreates,
    member: {
      count: async () => 1,
      findFirst: async () => ({
        id: "member-1",
        totalSavingsSnapshot: 100000,
      }),
      findMany: async () => [],
    },
    repaymentScheduleItem: {
      count: async () => 0,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantPolicy: {
      findUnique: async () => ({
        loanEligibilityMultiple: 2,
        reserveBufferAmount: 0,
      }),
    },
  }
}

function createLiveDisbursementPrismaStub(input?: {
  approvedHoldAmount?: number
  outstandingFinancingAmount?: number
  principalAmount?: number
  reserveBufferAmount?: number
  totalContributionAmount?: number
}) {
  const ledgerLookups: unknown[] = []
  const loanLookups: unknown[] = []
  const principalAmount = input?.principalAmount ?? 100000

  return {
    ...createLockedLoanPrismaStub(),
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
    contribution: {
      aggregate: async () => ({
        _sum: { amount: input?.totalContributionAmount ?? 0 },
      }),
    },
    ledgerAccount: {
      findUnique: async (lookup: unknown) => {
        ledgerLookups.push(lookup)
        return { id: `ledger-${ledgerLookups.length}` }
      },
    },
    ledgerLookups,
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loan: {
      aggregate: async (args: any) =>
        args._sum.outstandingPrincipal
          ? {
              _sum: {
                outstandingPrincipal:
                  input?.outstandingFinancingAmount ?? 0,
              },
            }
          : {
              _sum: {
                principalAmount: input?.approvedHoldAmount ?? 0,
              },
            },
      count: async () => 0,
      findFirst: async (lookup: unknown) => {
        loanLookups.push(lookup)
        return {
          id: "loan-1",
          principalAmount,
          tenantId: "tenant-1",
        }
      },
    },
    loanLookups,
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: new Date("2026-01-31T00:00:00.000Z"),
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantPolicy: {
      findUnique: async () => ({
        disbursementRequiresDeployableFunds: true,
        reserveBufferAmount: input?.reserveBufferAmount ?? 0,
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
  }
}

describe("loan live write guards", () => {
  test("blocks loan requests before live operations", async () => {
    const prisma = createLockedLoanPrismaStub()

    await expect(
      submitLoanRequest(
        {
          actorUserId: "user-1",
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 100000,
          requestedTermMonths: 12,
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberLookups).toHaveLength(0)
  })

  test("posts configured loan fee charge when a live loan request is submitted", async () => {
    const prisma = createLiveLoanRequestPrismaStub()

    await submitLoanRequest(
      {
          actorUserId: "user-1",
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 25000,
          requestedTermMonths: 10,
          tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.loanRequestCreates).toHaveLength(1)
    expect(prisma.chargeApplicationCreates[0]).toMatchObject({
      data: {
        amount: 2500,
        chargeDefinitionId: "loan-charge-1",
        loanRequestId: "loan-request-1",
        memberId: "member-1",
      },
    })
  })

  test("blocks loan requests when the monthly financing cycle is missing", async () => {
    const prisma = createLiveLoanRequestPrismaStub({ existingCycle: null })

    await expect(
      submitLoanRequest(
        {
          actorUserId: "user-1",
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 25000,
          requestedTermMonths: 10,
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Current monthly financing cycle is not open")

    expect(prisma.loanRequestCreates).toHaveLength(0)
  })

  test("blocks loan requests when the selected product allocation is exhausted", async () => {
    const prisma = createLiveLoanRequestPrismaStub({
      existingLoanRequests: [
        { amount: 29000, loanType: "quick", status: "submitted" },
        { amount: 100000, loanType: "quick", status: "rejected" },
      ],
    })

    await expect(
      submitLoanRequest(
        {
          actorUserId: "user-1",
          loanProductId: "product-1",
          memberId: "member-1",
          requestedAmount: 2000,
          requestedTermMonths: 10,
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Quick financing allocation")

    expect(prisma.loanRequestCreates).toHaveLength(0)
  })

  test("does not reserve rejected, cancelled, or expired request amounts", async () => {
    const prisma = createLiveLoanRequestPrismaStub({
      existingLoanRequests: [
        { amount: 30000, loanType: "quick", status: "rejected" },
        { amount: 30000, loanType: "quick", status: "cancelled" },
        { amount: 30000, loanType: "quick", status: "expired" },
      ],
    })

    await submitLoanRequest(
      {
        actorUserId: "user-1",
        loanProductId: "product-1",
        memberId: "member-1",
        requestedAmount: 25000,
        requestedTermMonths: 10,
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.loanRequestCreates).toHaveLength(1)
  })

  test("blocks loan disbursement before live operations", async () => {
    const prisma = createLockedLoanPrismaStub()

    await expect(
      disburseLoan(
        {
          actorUserId: "user-1",
          loanId: "loan-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.ledgerLookups).toHaveLength(0)
    expect(prisma.loanLookups).toHaveLength(0)
  })

  test("blocks loan disbursement when deployable funds are insufficient", async () => {
    const prisma = createLiveDisbursementPrismaStub({
      principalAmount: 100000,
      reserveBufferAmount: 10000,
      totalContributionAmount: 50000,
    })

    await expect(
      disburseLoan(
        {
          actorUserId: "user-1",
          loanId: "loan-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Deployable funds are insufficient")

    expect(prisma.ledgerLookups).toHaveLength(0)
    expect(prisma.loanLookups).toHaveLength(1)
  })

  test("blocks repayment posting before live operations", async () => {
    const prisma = createLockedLoanPrismaStub()

    await expect(
      postRepayment(
        {
          actorUserId: "user-1",
          amount: 25000,
          loanId: "loan-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.ledgerLookups).toHaveLength(0)
    expect(prisma.loanLookups).toHaveLength(0)
  })

  test("allows import repayment posting through the live-write guard", async () => {
    const prisma = createLockedLoanPrismaStub()

    await expect(
      postRepayment(
        {
          actorUserId: "user-1",
          amount: 25000,
          loanId: "loan-1",
          sourceType: "import",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Ledger accounts not initialized")

    expect(prisma.ledgerLookups).toHaveLength(2)
    expect(prisma.loanLookups).toHaveLength(0)
  })
})
