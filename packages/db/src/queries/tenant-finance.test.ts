import { describe, expect, test } from "bun:test"
import {
  createMemberShareApplication,
  createMemberShareLedgerEntry,
  createShareBusiness,
  createShareBusinessProfitEntry,
  createTenantShareStructureVersion,
  getResolvedShareAmountForMonth,
  generateHistoricalBackfillShareProfitAllocations,
  getTenantMigrationSetup,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
  listShareBusinessesTable,
  publishShareProfitAllocations,
  recommendTenantMigrationSetupMode,
  reviewMemberShareApplication,
  updateTenantBusinessProfitPolicy,
  updateTenantMigrationSetup,
  updateTenantSharePolicy,
  updateShareBusiness,
  updateShareBusinessProfitEntry,
  upsertTenantBroughtForwardSnapshot,
  upsertTenantShareStructureVersion,
} from "./tenant-finance"

function withMigrationState(
  overrides: {
    appliedBackfillBatches?: number
    initialMigrationStatus?: string
  },
  modelStubs: Record<string, unknown> = {}
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
  test("only returns a business next cursor when another row exists", async () => {
    const requestedTake: number[] = []
    const businessRow = (index: number) => ({
      capitalAmount: 1000 + index,
      endDate: null,
      id: `business-${index}`,
      name: `Business ${index}`,
      profitAmount: 100,
      profitEntries: [],
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      status: "active",
    })
    const pages = [
      [businessRow(1), businessRow(2), businessRow(3)],
      [businessRow(1), businessRow(2)],
    ]
    const prisma = {
      shareBusiness: {
        findMany: async ({ take }: { take: number }) => {
          requestedTake.push(take)
          return pages.shift() ?? []
        },
      },
    } as never

    const firstPage = await listShareBusinessesTable(
      "tenant-1",
      { pageSize: 2 },
      prisma
    )
    const finalPage = await listShareBusinessesTable(
      "tenant-1",
      { pageSize: 2 },
      prisma
    )

    expect(requestedTake).toEqual([3, 3])
    expect(firstPage.data).toHaveLength(2)
    expect(firstPage.meta).toEqual({
      cursor: "2",
      hasNextPage: true,
      hasPreviousPage: false,
    })
    expect(finalPage.data).toHaveLength(2)
    expect(finalPage.meta.cursor).toBeNull()
    expect(finalPage.meta.hasNextPage).toBe(false)
  })

  test("allows metadata-only corrections on finalized historical businesses", async () => {
    const auditCreates: unknown[] = []
    const businessUpdates: Array<Record<string, any>> = []
    const startDate = new Date("2026-01-01T00:00:00.000Z")

    const updated = await updateShareBusiness(
      {
        actorUserId: "user-1",
        capitalAmount: 20000000,
        name: "Layer Poultry Farm",
        notes: "1,000 hens, 800 eggs daily, ₦5,000 per crate.",
        profitAmount: 12000000,
        shareBusinessId: "business-1",
        startDate,
        status: "active",
        tenantId: "tenant-1",
      },
      {
        auditLog: {
          create: async (input: unknown) => {
            auditCreates.push(input)
            return input
          },
        },
        shareBusiness: {
          findFirst: async () => ({
            capitalAmount: 20000000,
            endDate: null,
            id: "business-1",
            linkedDividendPeriodId: null,
            name: "Layer Poultry Farm",
            notes: null,
            profitAmount: 12000000,
            profitEntries: [
              {
                allocations: [{ status: "published" }],
                sourceType: "backfill",
              },
            ],
            startDate,
            status: "active",
          }),
          update: async (input: Record<string, any>) => {
            businessUpdates.push(input)
            return { id: "business-1", ...input.data }
          },
        },
      } as never
    )

    expect(updated.notes).toContain("800 eggs daily")
    expect(businessUpdates).toHaveLength(1)
    expect(auditCreates).toEqual([
      {
        data: expect.objectContaining({
          action: "share_business.updated",
          metadata: {
            metadataOnly: true,
            status: "active",
          },
        }),
      },
    ])
  })

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
        } as never
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
          }
        ) as never
      )
    ).rejects.toThrow("Historical finance setup is locked")

    expect(shareStructureCreates).toHaveLength(0)
  })

  test("upserts share structure versions by tenant and effective date", async () => {
    const shareStructureUpserts: Record<string, unknown>[] = []

    await upsertTenantShareStructureVersion(
      {
        amount: 2000,
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        tenantId: "tenant-1",
        valueType: "fixed_amount",
      },
      withMigrationState(
        {},
        {
          tenantShareStructureVersion: {
            count: async () => 1,
            upsert: async (input: Record<string, unknown>) => {
              shareStructureUpserts.push(input)
              return input
            },
          },
        }
      ) as never
    )

    expect(shareStructureUpserts).toHaveLength(1)
    const upsertInput = shareStructureUpserts[0] as {
      update: Record<string, unknown>
    }

    expect(upsertInput).toMatchObject({
      where: {
        tenantId_effectiveFrom: {
          tenantId: "tenant-1",
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        },
      },
      create: {
        amount: 2000,
        tenantId: "tenant-1",
        valueType: "fixed_amount",
      },
      update: {
        amount: 2000,
        basis: "after_charge_deductions",
        valueType: "fixed_amount",
      },
    })
    expect(upsertInput.update).not.toHaveProperty("notes")
  })

  test("reads default share policy when tenant policy has not been configured", async () => {
    const policy = await getTenantSharePolicy("tenant-1", {
      tenantPolicy: {
        findUnique: async () => null,
      },
    } as never)

    expect(policy).toEqual({
      configurationMode: "monthly_history",
      compulsoryShareUnits: 1,
      id: null,
      maximumShareUnits: 20,
      unitAmount: 10000,
    })
  })

  test("reads default migration setup mode when tenant policy has not been configured", async () => {
    const setup = await getTenantMigrationSetup("tenant-1", {
      tenantPolicy: {
        findUnique: async () => null,
      },
    } as never)

    expect(setup).toEqual({
      id: null,
      mode: "historical_backfill",
    })
  })

  test("updates migration setup mode with audit metadata", async () => {
    const tenantPolicyUpserts: Record<string, unknown>[] = []
    const auditLogCreates: Record<string, unknown>[] = []

    const setup = await updateTenantMigrationSetup(
      {
        actorUserId: "user-1",
        mode: "brought_forward",
        tenantId: "tenant-1",
      },
      {
        auditLog: {
          create: async (input: Record<string, unknown>) => {
            auditLogCreates.push(input)
            return input
          },
        },
        tenantPolicy: {
          findUnique: async () => ({
            id: "policy-1",
            migrationSetupMode: "historical_backfill",
          }),
          upsert: async (input: Record<string, unknown>) => {
            tenantPolicyUpserts.push(input)
            return {
              id: "policy-1",
              migrationSetupMode: "brought_forward",
            }
          },
        },
      } as never
    )

    expect(setup).toEqual({
      id: "policy-1",
      mode: "brought_forward",
    })
    expect(tenantPolicyUpserts).toHaveLength(1)
    expect(tenantPolicyUpserts[0]).toMatchObject({
      create: {
        migrationSetupMode: "brought_forward",
        tenantId: "tenant-1",
      },
      update: {
        migrationSetupMode: "brought_forward",
      },
      where: { tenantId: "tenant-1" },
    })
    expect(auditLogCreates).toHaveLength(1)
    expect(auditLogCreates[0]).toMatchObject({
      data: {
        action: "tenant_policy.migration_setup_mode_updated",
        actorType: "user",
        actorUserId: "user-1",
        entityId: "policy-1",
        entityType: "TenantPolicy",
        metadata: {
          next: {
            id: "policy-1",
            mode: "brought_forward",
          },
          previous: {
            id: "policy-1",
            mode: "historical_backfill",
          },
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("stores a cooperative-wide brought-forward snapshot without changing member share limits", async () => {
    const auditLogCreates: Record<string, unknown>[] = []
    const snapshotUpserts: Record<string, unknown>[] = []

    const snapshot = await upsertTenantBroughtForwardSnapshot(
      {
        actorUserId: "user-1",
        asOfDate: "2026-07-23",
        memberCountSnapshot: 1000,
        notes: "Current cooperative totals; member records are sampled.",
        tenantId: "tenant-1",
        totalMemberSavingsAmount: 100_000_000,
        totalShareUnits: 5000,
        totalSpecialSavingsAmount: 1_000_000,
      },
      {
        ...withMigrationState(
          {},
          {
            auditLog: {
              count: async () => 0,
              create: async (input: Record<string, unknown>) => {
                auditLogCreates.push(input)
                return input
              },
            },
            tenantBroughtForwardSnapshot: {
              findUnique: async () => null,
              upsert: async (input: Record<string, any>) => {
                snapshotUpserts.push(input)
                return {
                  ...input.create,
                  id: "snapshot-1",
                }
              },
            },
            tenantPolicy: {
              findUnique: async () => ({
                compulsoryShareUnits: 2,
                id: "policy-1",
                maximumShareUnits: 15,
                migrationSetupMode: "brought_forward",
                shareConfigurationMode: "unit_based",
                shareUnitAmount: 5000,
              }),
            },
          }
        ),
      } as never
    )

    expect(snapshot).toMatchObject({
      id: "snapshot-1",
      memberCountSnapshot: 1000,
      shareUnitAmountSnapshot: 5000,
      totalMemberSavingsAmount: 100_000_000,
      totalShareCapitalAmount: 25_000_000,
      totalShareUnits: 5000,
      totalSpecialSavingsAmount: 1_000_000,
    })
    expect(snapshotUpserts).toHaveLength(1)
    expect(snapshotUpserts[0]).toMatchObject({
      create: {
        memberCountSnapshot: 1000,
        shareUnitAmountSnapshot: 5000,
        totalMemberSavingsAmount: 100_000_000,
        totalShareCapitalAmount: 25_000_000,
        totalShareUnits: 5000,
        totalSpecialSavingsAmount: 1_000_000,
      },
      where: { tenantId: "tenant-1" },
    })
    expect(auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.brought_forward_snapshot_updated",
        actorUserId: "user-1",
        entityId: "snapshot-1",
        entityType: "TenantBroughtForwardSnapshot",
      },
    })
  })

  test("recommends migration setup mode from age and member workload", () => {
    const now = new Date("2026-07-11T00:00:00.000Z")

    expect(
      recommendTenantMigrationSetupMode({
        memberCount: 80,
        now,
        startDate: "2026-01-01",
      })
    ).toBe("historical_backfill")
    expect(
      recommendTenantMigrationSetupMode({
        memberCount: 10,
        now,
        startDate: "2025-01-01",
      })
    ).toBe("historical_backfill")
    expect(
      recommendTenantMigrationSetupMode({
        memberCount: 20,
        now,
        startDate: "2025-01-01",
      })
    ).toBe("brought_forward")
    expect(
      recommendTenantMigrationSetupMode({
        memberCount: 20,
        now,
        startDate: null,
      })
    ).toBeNull()
    expect(
      recommendTenantMigrationSetupMode({
        memberCount: null,
        now,
        startDate: "2025-01-01",
      })
    ).toBeNull()
  })

  test("normalizes monthly share policy without exposing inactive unit settings", async () => {
    const policy = await getTenantSharePolicy("tenant-1", {
      tenantPolicy: {
        findUnique: async () => ({
          compulsoryShareUnits: 4,
          id: "policy-1",
          maximumShareUnits: 40,
          shareConfigurationMode: "monthly_history",
          shareUnitAmount: 25000,
        }),
      },
    } as never)

    expect(policy).toEqual({
      configurationMode: "monthly_history",
      compulsoryShareUnits: 1,
      id: "policy-1",
      maximumShareUnits: 20,
      unitAmount: 10000,
    })
  })

  test("updates share policy with audit metadata", async () => {
    const tenantPolicyUpserts: Record<string, unknown>[] = []
    const auditLogCreates: Record<string, unknown>[] = []

    const policy = await updateTenantSharePolicy(
      {
        actorUserId: "user-1",
        configurationMode: "unit_based",
        compulsoryShareUnits: 1,
        maximumShareUnits: 20,
        tenantId: "tenant-1",
        unitAmount: 10000,
      },
      {
        auditLog: {
          create: async (input: Record<string, unknown>) => {
            auditLogCreates.push(input)
            return input
          },
        },
        tenantPolicy: {
          findUnique: async () => ({
            compulsoryShareUnits: 1,
            id: "policy-1",
            maximumShareUnits: 15,
            shareConfigurationMode: "monthly_history",
            shareUnitAmount: 5000,
          }),
          upsert: async (input: Record<string, unknown>) => {
            tenantPolicyUpserts.push(input)
            return {
              compulsoryShareUnits: 1,
              id: "policy-1",
              maximumShareUnits: 20,
              shareConfigurationMode: "unit_based",
              shareUnitAmount: 10000,
            }
          },
        },
      } as never
    )

    expect(policy).toEqual({
      configurationMode: "unit_based",
      compulsoryShareUnits: 1,
      id: "policy-1",
      maximumShareUnits: 20,
      unitAmount: 10000,
    })
    expect(tenantPolicyUpserts).toHaveLength(1)
    expect(tenantPolicyUpserts[0]).toMatchObject({
      create: {
        compulsoryShareUnits: 1,
        maximumShareUnits: 20,
        shareConfigurationMode: "unit_based",
        shareUnitAmount: 10000,
        tenantId: "tenant-1",
      },
      update: {
        compulsoryShareUnits: 1,
        maximumShareUnits: 20,
        shareConfigurationMode: "unit_based",
        shareUnitAmount: 10000,
      },
      where: { tenantId: "tenant-1" },
    })
    expect(auditLogCreates).toHaveLength(1)
    expect(auditLogCreates[0]).toMatchObject({
      data: {
        action: "tenant_policy.share_policy_updated",
        actorType: "user",
        actorUserId: "user-1",
        entityId: "policy-1",
        entityType: "TenantPolicy",
        metadata: {
          next: {
            configurationMode: "unit_based",
            compulsoryShareUnits: 1,
            id: "policy-1",
            maximumShareUnits: 20,
            unitAmount: 10000,
          },
          previous: {
            configurationMode: "monthly_history",
            compulsoryShareUnits: 1,
            id: "policy-1",
            maximumShareUnits: 20,
            unitAmount: 10000,
          },
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("ignores inactive unit fields when monthly share history model is selected", async () => {
    const tenantPolicyUpserts: Record<string, unknown>[] = []

    const policy = await updateTenantSharePolicy(
      {
        configurationMode: "monthly_history",
        compulsoryShareUnits: 3,
        maximumShareUnits: 30,
        tenantId: "tenant-1",
        unitAmount: 25000,
      },
      {
        auditLog: {
          create: async () => ({}),
        },
        tenantPolicy: {
          findUnique: async () => ({
            compulsoryShareUnits: 2,
            id: "policy-1",
            maximumShareUnits: 10,
            shareConfigurationMode: "unit_based",
            shareUnitAmount: 15000,
          }),
          upsert: async (input: Record<string, unknown>) => {
            tenantPolicyUpserts.push(input)
            return {
              compulsoryShareUnits: 1,
              id: "policy-1",
              maximumShareUnits: 20,
              shareConfigurationMode: "monthly_history",
              shareUnitAmount: 10000,
            }
          },
        },
      } as never
    )

    expect(policy).toEqual({
      configurationMode: "monthly_history",
      compulsoryShareUnits: 1,
      id: "policy-1",
      maximumShareUnits: 20,
      unitAmount: 10000,
    })
    expect(tenantPolicyUpserts[0]).toMatchObject({
      create: {
        compulsoryShareUnits: 1,
        maximumShareUnits: 20,
        shareConfigurationMode: "monthly_history",
        shareUnitAmount: 10000,
        tenantId: "tenant-1",
      },
      update: {
        compulsoryShareUnits: 1,
        maximumShareUnits: 20,
        shareConfigurationMode: "monthly_history",
        shareUnitAmount: 10000,
      },
    })
  })

  test("rejects share policy maximum below compulsory units", async () => {
    await expect(
      updateTenantSharePolicy(
        {
          configurationMode: "unit_based",
          compulsoryShareUnits: 2,
          maximumShareUnits: 1,
          tenantId: "tenant-1",
          unitAmount: 10000,
        },
        {
          tenantPolicy: {
            findUnique: async () => null,
            upsert: async () => {
              throw new Error("should not persist invalid policy")
            },
          },
        } as never
      )
    ).rejects.toThrow("Maximum share units cannot be below compulsory")
  })

  test("blocks dated share history updates when unit share model is selected", async () => {
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
          {},
          {
            tenantPolicy: {
              findUnique: async () => ({
                compulsoryShareUnits: 1,
                id: "policy-1",
                maximumShareUnits: 20,
                shareConfigurationMode: "unit_based",
                shareUnitAmount: 10000,
              }),
            },
            tenantShareStructureVersion: {
              count: async () => 1,
              create: async (input: unknown) => {
                shareStructureCreates.push(input)
                return input
              },
            },
          }
        ) as never
      )
    ).rejects.toThrow("monthly share history model is selected")

    expect(shareStructureCreates).toHaveLength(0)
  })

  test("resolves no monthly share amount when unit share model is selected", async () => {
    const shareOverrideReads: unknown[] = []
    const shareStructureReads: unknown[] = []

    const amount = await getResolvedShareAmountForMonth(
      {
        memberId: "member-1",
        month: new Date("2025-01-01T00:00:00.000Z"),
        tenantId: "tenant-1",
      },
      {
        memberShareOverride: {
          findFirst: async (input: unknown) => {
            shareOverrideReads.push(input)
            return { amount: 600 }
          },
        },
        tenantPolicy: {
          findUnique: async () => ({
            compulsoryShareUnits: 1,
            id: "policy-1",
            maximumShareUnits: 20,
            shareConfigurationMode: "unit_based",
            shareUnitAmount: 10000,
          }),
        },
        tenantShareStructureVersion: {
          findFirst: async (input: unknown) => {
            shareStructureReads.push(input)
            return { amount: 500 }
          },
        },
      } as never
    )

    expect(amount).toBe(0)
    expect(shareOverrideReads).toHaveLength(0)
    expect(shareStructureReads).toHaveLength(0)
  })

  test("creates pending member share applications with unit share snapshots", async () => {
    const applicationCreates: Record<string, unknown>[] = []
    const auditLogCreates: Record<string, unknown>[] = []

    const application = await createMemberShareApplication(
      {
        memberId: "member-1",
        notes: "Member wants more shares",
        requestedByUserId: "user-1",
        requestedUnits: 3,
        tenantId: "tenant-1",
      },
      {
        auditLog: {
          create: async (input: Record<string, unknown>) => {
            auditLogCreates.push(input)
            return input
          },
        },
        member: {
          findFirst: async () => ({
            fullName: "Aisha Bello",
            id: "member-1",
            memberNumber: "M-001",
          }),
        },
        memberShareApplication: {
          create: async (input: any) => {
            applicationCreates.push(input)
            return {
              approvedUnits: null,
              createdAt: new Date("2026-07-08T10:00:00.000Z"),
              id: "share-app-1",
              reviewedAt: null,
              reviewedByUserId: null,
              reviewNotes: null,
              status: "pending",
              ...input.data,
              member: {
                fullName: "Aisha Bello",
                memberNumber: "M-001",
              },
            }
          },
          findMany: async () => [],
        },
        tenantPolicy: {
          findUnique: async () => ({
            compulsoryShareUnits: 1,
            id: "policy-1",
            maximumShareUnits: 20,
            shareConfigurationMode: "unit_based",
            shareUnitAmount: 10000,
          }),
        },
      } as never
    )

    expect(application).toMatchObject({
      id: "share-app-1",
      memberId: "member-1",
      memberName: "Aisha Bello",
      memberNumber: "M-001",
      requestedUnits: 3,
      shareValueSnapshot: 30000,
      status: "pending",
      unitAmountSnapshot: 10000,
    })
    expect(applicationCreates[0]).toMatchObject({
      data: {
        memberId: "member-1",
        notes: "Member wants more shares",
        requestedByUserId: "user-1",
        requestedUnits: 3,
        shareValueSnapshot: 30000,
        tenantId: "tenant-1",
        unitAmountSnapshot: 10000,
      },
    })
    expect(auditLogCreates[0]).toMatchObject({
      data: {
        action: "member_share_application.created",
        actorType: "user",
        actorUserId: "user-1",
        entityId: "share-app-1",
        entityType: "MemberShareApplication",
        metadata: {
          memberId: "member-1",
          requestedUnits: 3,
          shareValueSnapshot: 30000,
          unitAmountSnapshot: 10000,
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("blocks member share applications outside unit share model", async () => {
    const applicationCreates: unknown[] = []

    await expect(
      createMemberShareApplication(
        {
          memberId: "member-1",
          requestedUnits: 1,
          tenantId: "tenant-1",
        },
        {
          memberShareApplication: {
            create: async (input: unknown) => {
              applicationCreates.push(input)
              return input
            },
          },
          tenantPolicy: {
            findUnique: async () => ({
              compulsoryShareUnits: 1,
              id: "policy-1",
              maximumShareUnits: 20,
              shareConfigurationMode: "monthly_history",
              shareUnitAmount: 10000,
            }),
          },
        } as never
      )
    ).rejects.toThrow("unit-based shareholding model is selected")

    expect(applicationCreates).toHaveLength(0)
  })

  test("counts approved and pending optional shares before accepting applications", async () => {
    await expect(
      createMemberShareApplication(
        {
          memberId: "member-1",
          requestedUnits: 4,
          tenantId: "tenant-1",
        },
        {
          member: {
            findFirst: async () => ({
              fullName: "Aisha Bello",
              id: "member-1",
              memberNumber: "M-001",
            }),
          },
          memberShareApplication: {
            create: async () => {
              throw new Error("should not create over-cap application")
            },
            findMany: async () => [
              {
                approvedUnits: 2,
                id: "approved-1",
                requestedUnits: 2,
                status: "approved",
              },
              {
                approvedUnits: null,
                id: "pending-1",
                requestedUnits: 2,
                status: "pending",
              },
            ],
          },
          tenantPolicy: {
            findUnique: async () => ({
              compulsoryShareUnits: 1,
              id: "policy-1",
              maximumShareUnits: 8,
              shareConfigurationMode: "unit_based",
              shareUnitAmount: 10000,
            }),
          },
        } as never
      )
    ).rejects.toThrow("available optional share units")
  })

  test("summarizes member unit share position from compulsory, approved, and pending units", async () => {
    const position = await getMemberUnitSharePosition(
      {
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      {
        member: {
          findFirst: async () => ({
            fullName: "Aisha Bello",
            id: "member-1",
            memberNumber: "M-001",
          }),
        },
        memberShareApplication: {
          findMany: async () => [
            {
              approvedUnits: 2,
              id: "approved-1",
              requestedUnits: 2,
              status: "approved",
            },
            {
              approvedUnits: null,
              id: "approved-2",
              requestedUnits: 1,
              status: "approved",
            },
            {
              approvedUnits: null,
              id: "pending-1",
              requestedUnits: 4,
              status: "pending",
            },
          ],
        },
        tenantPolicy: {
          findUnique: async () => ({
            compulsoryShareUnits: 1,
            id: "policy-1",
            maximumShareUnits: 10,
            shareConfigurationMode: "unit_based",
            shareUnitAmount: 10000,
          }),
        },
      } as never
    )

    expect(position).toEqual({
      approvedOptionalUnits: 3,
      compulsoryUnits: 1,
      maximumUnits: 10,
      pendingOptionalUnits: 4,
      totalApprovedUnits: 4,
      totalApprovedValue: 40000,
      totalPendingUnits: 8,
      totalPendingValue: 80000,
      unitAmount: 10000,
    })
  })

  test("approves pending share applications into share ledger entries", async () => {
    const applicationUpdates: Record<string, unknown>[] = []
    const ledgerCreates: Record<string, unknown>[] = []
    const auditLogCreates: Record<string, unknown>[] = []

    const reviewed = await reviewMemberShareApplication(
      {
        actorUserId: "user-1",
        applicationId: "share-app-1",
        decision: "approved",
        effectiveDate: new Date("2026-07-08T00:00:00.000Z"),
        reviewNotes: "Approved after receipt review",
        tenantId: "tenant-1",
      },
      {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            ...withMigrationState({
              initialMigrationStatus: "live_operations",
            }),
            auditLog: {
              count: async () => 0,
              create: async (input: Record<string, unknown>) => {
                auditLogCreates.push(input)
                return input
              },
            },
            memberShareApplication: {
              update: async (input: any) => {
                applicationUpdates.push(input)
                return {
                  approvedUnits: input.data.approvedUnits,
                  createdAt: new Date("2026-07-08T10:00:00.000Z"),
                  id: "share-app-1",
                  memberId: "member-1",
                  notes: null,
                  requestedByUserId: "member-user-1",
                  requestedUnits: 2,
                  shareValueSnapshot: 20000,
                  unitAmountSnapshot: 10000,
                  ...input.data,
                  member: {
                    fullName: "Aisha Bello",
                    memberNumber: "M-001",
                  },
                }
              },
            },
            memberShareLedgerEntry: {
              create: async (input: Record<string, unknown>) => {
                ledgerCreates.push(input)
                return { id: "ledger-1", ...input.data }
              },
            },
          }),
        memberShareApplication: {
          findFirst: async () => ({
            createdAt: new Date("2026-07-08T10:00:00.000Z"),
            id: "share-app-1",
            member: {
              fullName: "Aisha Bello",
              memberNumber: "M-001",
            },
            memberId: "member-1",
            notes: null,
            requestedByUserId: "member-user-1",
            requestedUnits: 2,
            reviewedAt: null,
            reviewedByUserId: null,
            reviewNotes: null,
            shareValueSnapshot: 20000,
            status: "pending",
            unitAmountSnapshot: 10000,
          }),
          findMany: async () => [],
        },
        tenantPolicy: {
          findUnique: async () => ({
            compulsoryShareUnits: 1,
            id: "policy-1",
            maximumShareUnits: 20,
            shareConfigurationMode: "unit_based",
            shareUnitAmount: 10000,
          }),
        },
      } as never
    )

    expect(reviewed).toMatchObject({
      approvedUnits: 2,
      id: "share-app-1",
      memberId: "member-1",
      status: "approved",
    })
    expect(applicationUpdates[0]).toMatchObject({
      data: {
        approvedUnits: 2,
        reviewedByUserId: "user-1",
        reviewNotes: "Approved after receipt review",
        status: "approved",
      },
      where: { id: "share-app-1" },
    })
    expect(ledgerCreates[0]).toMatchObject({
      data: {
        amount: 20000,
        createdByUserId: "user-1",
        effectiveDate: new Date("2026-07-08T00:00:00.000Z"),
        memberId: "member-1",
        notes: "Approved after receipt review",
        sourceId: "share-app-1",
        sourceType: "share_application",
        tenantId: "tenant-1",
      },
    })
    expect(auditLogCreates[0]).toMatchObject({
      data: {
        action: "member_share_application.approved",
        actorUserId: "user-1",
        entityId: "share-app-1",
        entityType: "MemberShareApplication",
        metadata: {
          approvedAmount: 20000,
          approvedUnits: 2,
          memberId: "member-1",
          requestedUnits: 2,
          unitAmountSnapshot: 10000,
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("rejects pending share applications without posting share capital", async () => {
    const applicationUpdates: Record<string, unknown>[] = []
    const auditLogCreates: Record<string, unknown>[] = []

    const reviewed = await reviewMemberShareApplication(
      {
        actorUserId: "user-1",
        applicationId: "share-app-1",
        decision: "rejected",
        reviewNotes: "Member has reached the policy limit",
        tenantId: "tenant-1",
      },
      {
        auditLog: {
          create: async (input: Record<string, unknown>) => {
            auditLogCreates.push(input)
            return input
          },
        },
        memberShareApplication: {
          findFirst: async () => ({
            createdAt: new Date("2026-07-08T10:00:00.000Z"),
            id: "share-app-1",
            member: {
              fullName: "Aisha Bello",
              memberNumber: "M-001",
            },
            memberId: "member-1",
            notes: null,
            requestedByUserId: "member-user-1",
            requestedUnits: 2,
            reviewedAt: null,
            reviewedByUserId: null,
            reviewNotes: null,
            shareValueSnapshot: 20000,
            status: "pending",
            unitAmountSnapshot: 10000,
          }),
          update: async (input: any) => {
            applicationUpdates.push(input)
            return {
              createdAt: new Date("2026-07-08T10:00:00.000Z"),
              id: "share-app-1",
              memberId: "member-1",
              requestedByUserId: "member-user-1",
              requestedUnits: 2,
              shareValueSnapshot: 20000,
              unitAmountSnapshot: 10000,
              ...input.data,
              member: {
                fullName: "Aisha Bello",
                memberNumber: "M-001",
              },
            }
          },
        },
      } as never
    )

    expect(reviewed).toMatchObject({
      approvedUnits: null,
      id: "share-app-1",
      status: "rejected",
    })
    expect(applicationUpdates[0]).toMatchObject({
      data: {
        approvedUnits: null,
        reviewedByUserId: "user-1",
        reviewNotes: "Member has reached the policy limit",
        status: "rejected",
      },
      where: { id: "share-app-1" },
    })
    expect(auditLogCreates[0]).toMatchObject({
      data: {
        action: "member_share_application.rejected",
        actorUserId: "user-1",
        entityId: "share-app-1",
        entityType: "MemberShareApplication",
        metadata: {
          memberId: "member-1",
          requestedUnits: 2,
          reviewNotes: "Member has reached the policy limit",
        },
        tenantId: "tenant-1",
      },
    })
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
          }
        ) as never
      )
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
        }
      ) as never
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
          }
        ) as never
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
        profitEntries: [
          {
            allocatableProfitAmount: 10000,
            expenseAmount: 0,
            profitAmount: 10000,
            profitDate: new Date("2026-01-31T00:00:00.000Z"),
            status: "completed",
          },
        ],
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
      } as never
    )

    expect(businessCreates).toHaveLength(1)
    expect(profitEntryCreates[0]).toMatchObject({
      data: {
        sourceType: "manual",
        status: "completed",
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
          }
        ) as never
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
          }
        ) as never
      )
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
        }
      ) as never
    )

    expect(shareLedgerCreates).toHaveLength(1)
  })

  test("generates historical backfill dividends from unit share ledger records", async () => {
    const allocationCreates: Record<string, unknown>[] = []
    const allocationDeletes: Record<string, unknown>[] = []
    const tx = {
      ...withMigrationState({}),
      memberAmountLog: {
        findMany: async () => [],
      },
      memberShareLedgerEntry: {
        findMany: async () => [
          {
            amount: 20000,
            member: {
              fullName: "Aisha Bello",
              memberNumber: "M-001",
            },
            memberId: "member-1",
          },
          {
            amount: 10000,
            member: {
              fullName: "Bola Musa",
              memberNumber: "M-002",
            },
            memberId: "member-2",
          },
        ],
      },
      shareBusinessProfitEntry: {
        count: async () => 1,
        findFirst: async () => ({
          allocatableProfitAmount: 3000,
          id: "profit-entry-1",
          profitAmount: 3000,
          profitDate: new Date("2026-01-31T00:00:00.000Z"),
          sourceType: "backfill",
        }),
        findMany: async () => [{ id: "profit-entry-1" }],
      },
      shareProfitAllocation: {
        createMany: async (input: Record<string, unknown>) => {
          allocationCreates.push(input)
          return { count: 2 }
        },
        deleteMany: async (input: Record<string, unknown>) => {
          allocationDeletes.push(input)
          return { count: 0 }
        },
        findMany: async () => [
          {
            allocatedProfitAmount: 2000,
            memberId: "member-1",
            profitEntryId: "profit-entry-1",
          },
          {
            allocatedProfitAmount: 1000,
            memberId: "member-2",
            profitEntryId: "profit-entry-1",
          },
        ],
      },
      tenantPolicy: {
        findUnique: async () => ({
          migrationSetupMode: "historical_backfill",
          shareConfigurationMode: "unit_based",
        }),
      },
    }

    const allocations = await generateHistoricalBackfillShareProfitAllocations(
      {
        actorUserId: "user-1",
        tenantId: "tenant-1",
      },
      {
        ...tx,
        $transaction: async (
          callback: (transaction: typeof tx) => Promise<unknown>
        ) => callback(tx),
      } as never
    )

    expect(allocations).toHaveLength(2)
    expect(allocationDeletes[0]).toMatchObject({
      where: {
        profitEntryId: "profit-entry-1",
        status: "draft",
        tenantId: "tenant-1",
      },
    })
    expect(allocationCreates[0]).toMatchObject({
      data: [
        expect.objectContaining({
          allocatedProfitAmount: 2000,
          memberId: "member-1",
          memberShareBalance: 20000,
          profitEntryId: "profit-entry-1",
          status: "draft",
          tenantId: "tenant-1",
          totalShareBalance: 30000,
        }),
        expect.objectContaining({
          allocatedProfitAmount: 1000,
          memberId: "member-2",
          memberShareBalance: 10000,
        }),
      ],
    })
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
      } as never
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

  test.each([
    { distributable: 90, reserve: 20 },
    { distributable: 60, reserve: 20 },
  ])(
    "rejects a tenant business profit policy split that does not total 100%",
    async ({ distributable, reserve }) => {
      const policyUpserts: unknown[] = []

      await expect(
        updateTenantBusinessProfitPolicy(
          {
            defaultDistributablePercentage: distributable,
            financialYearStartMonth: 1,
            profitDistributionFrequency: "annual",
            requiresProfitDistributionApproval: true,
            reserveRetentionPercentage: reserve,
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
          } as never
        )
      ).rejects.toThrow(
        "Distributable percentage plus reserve retention must equal 100%."
      )

      expect(policyUpserts).toHaveLength(0)
    }
  )

  test("publishes dividend periods with aggregated member allocations across linked profit entries", async () => {
    const auditLogCreates: Record<string, unknown>[] = []
    const dividendAllocationCreates: Record<string, unknown>[] = []
    const dividendAllocationDeletes: Record<string, unknown>[] = []
    const dividendPeriodUpdates: Record<string, unknown>[] = []
    const shareProfitAllocationUpdates: Record<string, unknown>[] = []

    await publishShareProfitAllocations(
      {
        actorUserId: "user-1",
        profitEntryId: "profit-entry-1",
        tenantId: "tenant-1",
      },
      {
        ...withMigrationState({ initialMigrationStatus: "live_operations" }),
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            ...withMigrationState({
              initialMigrationStatus: "live_operations",
            }),
            auditLog: {
              create: async (input: Record<string, unknown>) => {
                auditLogCreates.push(input)
                return input
              },
            },
            dividendAllocation: {
              createMany: async (input: Record<string, unknown>) => {
                dividendAllocationCreates.push(input)
                return { count: (input.data as unknown[]).length }
              },
              deleteMany: async (input: Record<string, unknown>) => {
                dividendAllocationDeletes.push(input)
                return { count: 2 }
              },
            },
            dividendPeriod: {
              update: async (input: Record<string, unknown>) => {
                dividendPeriodUpdates.push(input)
                return input
              },
            },
            shareBusinessProfitEntry: {
              count: async () => 1,
              findFirst: async () => ({
                id: "profit-entry-1",
                allocations: [
                  {
                    allocatedProfitAmount: 6000,
                    memberId: "member-1",
                    memberShareBalance: 10000,
                    status: "draft",
                  },
                  {
                    allocatedProfitAmount: 4000,
                    memberId: "member-2",
                    memberShareBalance: 8000,
                    status: "draft",
                  },
                ],
                linkedDividendPeriodId: "dividend-period-1",
                sourceType: "manual",
              }),
              findMany: async () => [
                {
                  id: "profit-entry-1",
                  allocations: [
                    {
                      allocatedProfitAmount: 6000,
                      memberId: "member-1",
                      memberShareBalance: 10000,
                      status: "published",
                    },
                    {
                      allocatedProfitAmount: 4000,
                      memberId: "member-2",
                      memberShareBalance: 8000,
                      status: "published",
                    },
                  ],
                },
                {
                  id: "profit-entry-2",
                  allocations: [
                    {
                      allocatedProfitAmount: 3000,
                      memberId: "member-1",
                      memberShareBalance: 12000,
                      status: "published",
                    },
                    {
                      allocatedProfitAmount: 2000,
                      memberId: "member-2",
                      memberShareBalance: 9000,
                      status: "published",
                    },
                  ],
                },
              ],
            },
            shareProfitAllocation: {
              findMany: async () => [],
              updateMany: async (input: Record<string, unknown>) => {
                shareProfitAllocationUpdates.push(input)
                return { count: 2 }
              },
            },
          }),
      } as never
    )

    expect(shareProfitAllocationUpdates[0]).toMatchObject({
      data: {
        status: "published",
      },
      where: {
        profitEntryId: "profit-entry-1",
        status: "draft",
        tenantId: "tenant-1",
      },
    })
    expect(dividendAllocationDeletes[0]).toMatchObject({
      where: {
        dividendPeriodId: "dividend-period-1",
        tenantId: "tenant-1",
      },
    })
    expect(dividendAllocationCreates[0]).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          allocationAmount: 9000,
          dividendPeriodId: "dividend-period-1",
          memberId: "member-1",
          savingsBasisAmount: 22000,
          tenantId: "tenant-1",
        }),
        expect.objectContaining({
          allocationAmount: 6000,
          dividendPeriodId: "dividend-period-1",
          memberId: "member-2",
          savingsBasisAmount: 17000,
          tenantId: "tenant-1",
        }),
      ]),
    })
    expect(dividendPeriodUpdates[0]).toMatchObject({
      data: {
        publishedAt: expect.any(Date),
        status: "published",
      },
      where: {
        id: "dividend-period-1",
        tenantId: "tenant-1",
      },
    })
    expect(auditLogCreates[0]).toMatchObject({
      data: {
        action: "share_profit_allocations.published",
        actorUserId: "user-1",
        metadata: {
          dividendPeriodId: "dividend-period-1",
          dividendPeriodPublished: true,
          periodAllocationCount: 2,
          periodAllocationTotal: 15000,
        },
      },
    })
  })

  test("keeps dividend period approved until all linked profit entries are published", async () => {
    const dividendAllocationCreates: Record<string, unknown>[] = []
    const dividendPeriodUpdates: Record<string, unknown>[] = []

    await publishShareProfitAllocations(
      {
        profitEntryId: "profit-entry-1",
        tenantId: "tenant-1",
      },
      {
        ...withMigrationState({ initialMigrationStatus: "live_operations" }),
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            ...withMigrationState({
              initialMigrationStatus: "live_operations",
            }),
            auditLog: {
              create: async () => ({}),
            },
            dividendAllocation: {
              createMany: async (input: Record<string, unknown>) => {
                dividendAllocationCreates.push(input)
                return { count: (input.data as unknown[]).length }
              },
              deleteMany: async () => ({ count: 0 }),
            },
            dividendPeriod: {
              update: async (input: Record<string, unknown>) => {
                dividendPeriodUpdates.push(input)
                return input
              },
            },
            shareBusinessProfitEntry: {
              count: async () => 1,
              findFirst: async () => ({
                id: "profit-entry-1",
                allocations: [
                  {
                    allocatedProfitAmount: 6000,
                    memberId: "member-1",
                    memberShareBalance: 10000,
                    status: "draft",
                  },
                ],
                linkedDividendPeriodId: "dividend-period-1",
                sourceType: "manual",
              }),
              findMany: async () => [
                {
                  id: "profit-entry-1",
                  allocations: [
                    {
                      allocatedProfitAmount: 6000,
                      memberId: "member-1",
                      memberShareBalance: 10000,
                      status: "published",
                    },
                  ],
                },
                {
                  id: "profit-entry-2",
                  allocations: [
                    {
                      allocatedProfitAmount: 2000,
                      memberId: "member-1",
                      memberShareBalance: 12000,
                      status: "draft",
                    },
                  ],
                },
              ],
            },
            shareProfitAllocation: {
              findMany: async () => [],
              updateMany: async () => ({ count: 1 }),
            },
          }),
      } as never
    )

    expect(dividendAllocationCreates[0]).toMatchObject({
      data: [
        expect.objectContaining({
          allocationAmount: 6000,
          dividendPeriodId: "dividend-period-1",
          memberId: "member-1",
          savingsBasisAmount: 10000,
        }),
      ],
    })
    expect(dividendPeriodUpdates).toHaveLength(0)
  })
})
