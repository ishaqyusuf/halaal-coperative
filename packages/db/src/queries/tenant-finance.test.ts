import { describe, expect, test } from "bun:test"
import {
  createMemberShareLedgerEntry,
  createShareBusiness,
  createShareBusinessProfitEntry,
  createTenantShareStructureVersion,
  updateTenantBusinessProfitPolicy,
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
              ...withMigrationState({}),
              shareBusinessProfitEntry: {
                count: async () => 1,
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

  test("allows manual business profit entries after live operations begin", async () => {
    const auditLogCreates: unknown[] = []
    const profitEntryCreates: unknown[] = []

    await createShareBusinessProfitEntry(
      {
        createdByUserId: "user-1",
        profitAmount: 10000,
        profitDate: new Date("2026-01-31T00:00:00.000Z"),
        shareBusinessId: "business-1",
        sourceType: "manual",
        tenantId: "tenant-1",
      },
      withMigrationState(
        {
          appliedBackfillBatches: 1,
          initialMigrationStatus: "live_operations",
        },
        {
          auditLog: {
            count: async () => 0,
            create: async (input: unknown) => {
              auditLogCreates.push(input)
              return input
            },
          },
          shareBusinessProfitEntry: {
            count: async () => 1,
            create: async (input: any) => {
              profitEntryCreates.push(input)
              return { id: "profit-entry-1", ...input.data }
            },
          },
        },
      ) as never,
    )

    expect(profitEntryCreates).toHaveLength(1)
    expect(profitEntryCreates[0]).toMatchObject({
      data: {
        sourceType: "manual",
      },
    })
    expect(auditLogCreates[0]).toMatchObject({
      data: {
        action: "share_business_profit_entry.created",
        actorUserId: "user-1",
        entityId: "profit-entry-1",
        entityType: "ShareBusinessProfitEntry",
        tenantId: "tenant-1",
      },
    })
  })

  test("blocks historical business profit rows after live operations begin", async () => {
    const profitEntryCreates: unknown[] = []

    await expect(
      createShareBusinessProfitEntry(
        {
          profitAmount: 10000,
          profitDate: new Date("2026-01-31T00:00:00.000Z"),
          shareBusinessId: "business-1",
          sourceType: "backfill",
          tenantId: "tenant-1",
        },
        withMigrationState(
          { initialMigrationStatus: "live_operations" },
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
      )
    ).rejects.toThrow("Historical business profit migration records are locked")

    expect(profitEntryCreates).toHaveLength(0)
  })

  test("allows manual business pools after live operations begin", async () => {
    const auditLogCreates: unknown[] = []
    const businessCreates: unknown[] = []
    const profitEntryCreates: unknown[] = []

    await createShareBusiness(
      {
        capitalAmount: 50000,
        createdByUserId: "user-1",
        name: "Retail pool",
        profitAmount: 10000,
        sourceType: "manual",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        status: "active",
        tenantId: "tenant-1",
      },
      {
        ...withMigrationState({
          appliedBackfillBatches: 1,
          initialMigrationStatus: "live_operations",
        }),
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            auditLog: {
              create: async (input: unknown) => {
                auditLogCreates.push(input)
                return input
              },
            },
            shareBusiness: {
              create: async (input: any) => {
                businessCreates.push(input)
                return { id: "business-1", ...input.data }
              },
              findFirst: async () => ({
                id: "business-1",
                profitEntries: [],
              }),
            },
            shareBusinessProfitEntry: {
              create: async (input: unknown) => {
                profitEntryCreates.push(input)
                return { id: "profit-entry-1" }
              },
            },
            shareBusinessProfitExpenseLine: {
              create: async () => null,
            },
          }),
      } as never,
    )

    expect(businessCreates).toHaveLength(1)
    expect(profitEntryCreates[0]).toMatchObject({
      data: {
        sourceType: "manual",
      },
    })
    expect(auditLogCreates[0]).toMatchObject({
      data: {
        action: "share_business.created",
        actorUserId: "user-1",
        entityId: "business-1",
        entityType: "ShareBusiness",
        tenantId: "tenant-1",
      },
    })
  })

  test("blocks historical business pool creation after live operations begin", async () => {
    const businessCreates: unknown[] = []

    await expect(
      createShareBusiness(
        {
          capitalAmount: 50000,
          name: "Historical retail pool",
          profitAmount: 10000,
          sourceType: "backfill",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        withMigrationState(
          { initialMigrationStatus: "live_operations" },
          {
            shareBusiness: {
              create: async (input: unknown) => {
                businessCreates.push(input)
                return input
              },
            },
          },
        ) as never,
      )
    ).rejects.toThrow("Historical business profit migration records are locked")

    expect(businessCreates).toHaveLength(0)
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

  test("upserts and audits tenant business profit policy", async () => {
    const auditLogCreates: unknown[] = []
    const policyUpserts: unknown[] = []

    const policy = await updateTenantBusinessProfitPolicy(
      {
        actorUserId: "user-1",
        defaultDistributablePercentage: 80,
        financialYearStartMonth: 4,
        historicalProfitMigrationMode: "no_historical_business_profit",
        profitDistributionFrequency: "quarterly",
        requiresProfitDistributionApproval: true,
        reserveRetentionPercentage: 20,
        tenantId: "tenant-1",
      },
      {
        auditLog: {
          create: async (input: unknown) => {
            auditLogCreates.push(input)
            return input
          },
        },
        tenantBusinessPolicy: {
          findUnique: async () => null,
          upsert: async (input: any) => {
            policyUpserts.push(input)
            return {
              id: "business-policy-1",
              tenantId: "tenant-1",
              ...input.create,
            }
          },
        },
      } as never,
    )

    expect(policy).toMatchObject({
      defaultDistributablePercentage: 80,
      financialYearStartMonth: 4,
      historicalProfitMigrationMode: "no_historical_business_profit",
      profitDistributionFrequency: "quarterly",
      reserveRetentionPercentage: 20,
    })
    expect(policyUpserts[0]).toMatchObject({
      create: {
        tenantId: "tenant-1",
        profitDistributionFrequency: "quarterly",
      },
      where: {
        tenantId: "tenant-1",
      },
    })
    expect(auditLogCreates[0]).toMatchObject({
      data: {
        action: "tenant_business_policy.updated",
        actorUserId: "user-1",
        entityId: "business-policy-1",
        entityType: "TenantBusinessPolicy",
        tenantId: "tenant-1",
      },
    })
  })

  test("rejects tenant business profit policy percentages above 100", async () => {
    const policyUpserts: unknown[] = []

    await expect(
      updateTenantBusinessProfitPolicy(
        {
          defaultDistributablePercentage: 90,
          financialYearStartMonth: 1,
          profitDistributionFrequency: "annual",
          requiresProfitDistributionApproval: true,
          reserveRetentionPercentage: 20,
          tenantId: "tenant-1",
        },
        {
          tenantBusinessPolicy: {
            findUnique: async () => null,
            upsert: async (input: unknown) => {
              policyUpserts.push(input)
              return input
            },
          },
        } as never,
      )
    ).rejects.toThrow(
      "Distributable percentage plus reserve retention cannot exceed 100."
    )

    expect(policyUpserts).toHaveLength(0)
  })
})
