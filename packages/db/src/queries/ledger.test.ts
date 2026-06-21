import { describe, expect, test } from "bun:test"
import { postLedgerTransaction } from "./ledger"

function createLockedLedgerPrismaStub() {
  const ledgerTransactionCreates: unknown[] = []

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
      count: async () => 1,
    },
    ledgerTransaction: {
      create: async (input: unknown) => {
        ledgerTransactionCreates.push(input)

        return input
      },
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
    ledgerTransactionCreates,
  }
}

const balancedLedgerTransactionInput = {
  entries: [
    {
      amount: 1000,
      direction: "debit" as const,
      ledgerAccountId: "cash-account",
    },
    {
      amount: 1000,
      direction: "credit" as const,
      ledgerAccountId: "member-savings-account",
    },
  ],
  postedAt: new Date("2025-02-01T00:00:00.000Z"),
  tenantId: "tenant-1",
  transactionType: "contribution" as const,
}

describe("ledger transaction migration guards", () => {
  test("blocks direct ledger posting before live operations", async () => {
    const prisma = createLockedLedgerPrismaStub()

    await expect(
      postLedgerTransaction(
        balancedLedgerTransactionInput,
        prisma as never,
      ),
    ).rejects.toThrow("Ledger transaction writes are locked")

    expect(prisma.ledgerTransactionCreates).toHaveLength(0)
  })

  test("allows import-sourced ledger posting during migration", async () => {
    const prisma = createLockedLedgerPrismaStub()

    await postLedgerTransaction(
      {
        ...balancedLedgerTransactionInput,
        sourceType: "import",
      },
      prisma as never,
    )

    expect(prisma.ledgerTransactionCreates).toHaveLength(1)
  })
})
