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
