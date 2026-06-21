import { describe, expect, test } from "bun:test"
import {
  createMemberShareLedgerEntry,
  createShareBusinessProfitEntry,
  createTenantShareStructureVersion,
  updateShareBusinessProfitEntry,
} from "./tenant-finance"

function withMigrationState(
  overrides: {
    appliedBackfillBatches?: number
    initialMigrationStatus?: string
  },
  modelStubs: Record<string, unknown> = {},
) {
  const appliedBackfillBatches = overrides.appliedBackfillBatches ?? 0
  const initialMigrationStatus =
    overrides.initialMigrationStatus ?? "historical_setup_in_progress"
  const base = {
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
    },
    backfillBatch: {
      count: async () => appliedBackfillBatches,
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
      findMany: async () => [],
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
          initialMigrationStatus === "finalized" ||
          initialMigrationStatus === "live_operations"
            ? new Date("2026-01-31T00:00:00.000Z")
            : null,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
  }

  return {
    ...base,
    ...modelStubs,
  }
}

describe("tenant finance queries", () => {
  test("blocks profit entry updates after allocations are published", async () => {
    const deletedDraftAllocations: unknown[] = []
    const updatedProfitEntries: unknown[] = []

    await expect(
      updateShareBusinessProfitEntry(
        {
          allocatableProfitAmount: 9000,
          expenseAmount: 1000,
          profitAmount: 10000,
          profitDate: new Date("2026-01-31T00:00:00.000Z"),
          profitEntryId: "profit-entry-1",
          status: "reviewed",
          tenantId: "tenant-1",
        },
        {
          ...withMigrationState({}),
          $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
            callback({
              shareBusinessProfitEntry: {
                findFirst: async () => ({
                  id: "profit-entry-1",
                  allocations: [{ status: "published" }],
                  sourceType: "manual",
                  status: "reviewed",
                }),
                update: async (input: unknown) => {
                  updatedProfitEntries.push(input)
                  return input
                },
              },
              shareProfitAllocation: {
                deleteMany: async (input: unknown) => {
                  deletedDraftAllocations.push(input)
                  return { count: 1 }
                },
              },
            }),
        } as never,
      )
    ).rejects.toThrow("Published profit allocations cannot be edited")

    expect(deletedDraftAllocations).toHaveLength(0)
    expect(updatedProfitEntries).toHaveLength(0)
  })

  test("blocks share structure changes after migration finalization", async () => {
    const shareStructureCreates: unknown[] = []

    await expect(
      createTenantShareStructureVersion(
        {
          amount: 1000,
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
          tenantId: "tenant-1",
          valueType: "fixed_amount",
        },
        withMigrationState(
          { initialMigrationStatus: "finalized" },
          {
            tenantShareStructureVersion: {
              count: async () => 1,
              create: async (input: unknown) => {
                shareStructureCreates.push(input)
                return input
              },
            },
          },
        ) as never,
      ),
    ).rejects.toThrow("Historical finance setup is locked")

    expect(shareStructureCreates).toHaveLength(0)
  })

  test("blocks business profit setup after member backfill starts", async () => {
    const profitEntryCreates: unknown[] = []

    await expect(
      createShareBusinessProfitEntry(
        {
          profitAmount: 10000,
          profitDate: new Date("2026-01-31T00:00:00.000Z"),
          shareBusinessId: "business-1",
          tenantId: "tenant-1",
        },
        withMigrationState(
          { appliedBackfillBatches: 1 },
          {
            shareBusinessProfitEntry: {
              count: async () => 1,
              create: async (input: unknown) => {
                profitEntryCreates.push(input)
                return input
              },
            },
          },
        ) as never,
      ),
    ).rejects.toThrow("member ledger backfill has already started")

    expect(profitEntryCreates).toHaveLength(0)
  })

  test("blocks manual share ledger entries before live operations", async () => {
    const shareLedgerCreates: unknown[] = []

    await expect(
      createMemberShareLedgerEntry(
        {
          amount: 1000,
          effectiveDate: new Date("2026-01-31T00:00:00.000Z"),
          memberId: "member-1",
          sourceType: "manual_adjustment",
          tenantId: "tenant-1",
        },
        withMigrationState(
          {},
          {
            memberShareLedgerEntry: {
              create: async (input: unknown) => {
                shareLedgerCreates.push(input)
                return input
              },
            },
          },
        ) as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(shareLedgerCreates).toHaveLength(0)
  })

  test("allows backfill share ledger entries during migration", async () => {
    const shareLedgerCreates: unknown[] = []

    await createMemberShareLedgerEntry(
      {
        amount: 1000,
        effectiveDate: new Date("2026-01-31T00:00:00.000Z"),
        memberId: "member-1",
        sourceType: "backfill",
        tenantId: "tenant-1",
      },
      withMigrationState(
        {},
        {
          memberShareLedgerEntry: {
            create: async (input: unknown) => {
              shareLedgerCreates.push(input)
              return input
            },
          },
        },
      ) as never,
    )

    expect(shareLedgerCreates).toHaveLength(1)
  })
})
