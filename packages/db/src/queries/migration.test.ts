import { describe, expect, test } from "bun:test"
import {
  finalizeTenantInitialMigration,
  getTenantInitialMigrationState,
  markTenantBusinessProfitPoolsReviewed,
  markTenantLegacyLoansReviewed,
  setTenantInitialMigrationEmergencyUnlock,
} from "./migration"

function createMigrationStatePrismaStub(input: {
  appliedBackfillBatches: number
  appliedBackfillMonths?: Array<{
    memberId: string
    month: Date
  }>
  appliedBackfillMonthMembers?: number
  appliedBackfillMembers?: number
  businessProfitPools: number
  businessProfitReviewMarkers?: number
  chargeScheduleVersions: number
  initialMigrationStatus?: string | null
  legacyLoanMigrationDrafts?: number
  legacyLoanReviewMarkers?: number
  legacyLoans: number
  memberProfiles: number
  memberJoinedAt?: Date
  migrationEmergencyUnlockUntil?: Date | null
  migrationFinalizedAt?: Date | null
  shareCapitalPlans: number
  startDate: Date | null
}) {
  const auditLogCreates: unknown[] = []
  const tenantUpdateCalls: unknown[] = []
  const tenantState = {
    id: "tenant-1",
    initialMigrationStatus: input.initialMigrationStatus ?? "not_started",
    migrationEmergencyUnlockUntil:
      input.migrationEmergencyUnlockUntil ?? null,
    migrationFinalizedAt: input.migrationFinalizedAt ?? null,
    startDate: input.startDate,
  }

  return {
    appliedBackfillMonth: {
      findMany: async () =>
        input.appliedBackfillMonths ??
        Array.from(
          { length: input.appliedBackfillMonthMembers ?? 0 },
          (_, index) => ({
            memberId: `member-${index + 1}`,
            month: input.memberJoinedAt ?? new Date("2025-01-01T00:00:00.000Z"),
          })
        ),
    },
    auditLog: {
      count: async (query: any) =>
        query?.where?.action === "migration.business_profit_pools.reviewed"
          ? (input.businessProfitReviewMarkers ?? 0)
          : (input.legacyLoanReviewMarkers ?? 0),
      create: async (data: unknown) => {
        auditLogCreates.push(data)
        return data
      },
    },
    auditLogCreates,
    backfillBatch: {
      count: async () => input.appliedBackfillBatches,
      findMany: async () =>
        Array.from(
          {
            length:
              input.appliedBackfillMembers ?? input.appliedBackfillBatches,
          },
          (_, index) => ({
            memberId: `member-${index + 1}`,
          })
        ),
    },
    chargeDefinitionVersion: {
      count: async () => input.chargeScheduleVersions,
    },
    legacyLoanMigrationDraft: {
      count: async () => input.legacyLoanMigrationDrafts ?? 0,
    },
    loan: {
      count: async () => input.legacyLoans,
    },
    member: {
      findMany: async () =>
        Array.from({ length: input.memberProfiles }, (_, index) => ({
          id: `member-${index + 1}`,
          joinedAt:
            input.memberJoinedAt ?? new Date("2025-01-01T00:00:00.000Z"),
        })),
    },
    shareBusinessProfitEntry: {
      count: async () => input.businessProfitPools,
    },
    tenant: {
      findUnique: async () => tenantState,
      update: async (query: any) => {
        tenantUpdateCalls.push(query)
        Object.assign(tenantState, query.data)
        return query
      },
    },
    tenantUpdateCalls,
    tenantShareStructureVersion: {
      count: async () => input.shareCapitalPlans,
    },
  }
}

describe("tenant initial migration state query", () => {
  test("starts as not started without a finance start date", async () => {
    const state = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 0,
        businessProfitPools: 0,
        chargeScheduleVersions: 0,
        initialMigrationStatus: null,
        legacyLoans: 0,
        memberProfiles: 0,
        shareCapitalPlans: 0,
        startDate: null,
      }) as never
    )

    expect(state.snapshot.status).toBe("not_started")
    expect(state.snapshot.canUseMigrationTools).toBe(true)
    expect(state.snapshot.canUseLiveFinancialWrites).toBe(false)
  })

  test("keeps member migration in progress until applied backfill covers every member", async () => {
    const state = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 3,
        appliedBackfillMembers: 3,
        businessProfitPools: 1,
        chargeScheduleVersions: 2,
        initialMigrationStatus: null,
        legacyLoanMigrationDrafts: 2,
        legacyLoans: 1,
        memberProfiles: 12,
        shareCapitalPlans: 1,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }) as never
    )

    expect(state.counts).toEqual({
      appliedBackfillBatches: 3,
      appliedBackfillMonths: 0,
      appliedBackfillMembers: 3,
      businessProfitPools: 1,
      chargeScheduleVersions: 2,
      legacyLoans: 3,
      memberProfiles: 12,
      shareCapitalPlans: 1,
    })
    expect(state.snapshot.status).toBe("member_migration_in_progress")
    expect(state.snapshot.missingStepKeys).toContain("member_ledger_backfill")
  })

  test("moves to migration review after applied backfill covers every member", async () => {
    const state = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 12,
        appliedBackfillMembers: 12,
        businessProfitPools: 1,
        chargeScheduleVersions: 2,
        initialMigrationStatus: null,
        legacyLoanMigrationDrafts: 2,
        legacyLoans: 1,
        memberProfiles: 12,
        shareCapitalPlans: 1,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }) as never
    )

    expect(state.counts.appliedBackfillMembers).toBe(12)
    expect(state.snapshot.status).toBe("migration_review")
    expect(state.snapshot.missingStepKeys).toEqual(["finalization"])
  })

  test("keeps legacy loan review missing until loans are drafted or explicitly reviewed", async () => {
    const missingReview = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 12,
        appliedBackfillMembers: 12,
        businessProfitPools: 1,
        chargeScheduleVersions: 2,
        initialMigrationStatus: null,
        legacyLoans: 0,
        memberProfiles: 12,
        shareCapitalPlans: 1,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }) as never
    )

    expect(missingReview.snapshot.status).toBe("historical_setup_in_progress")
    expect(missingReview.snapshot.missingStepKeys).toContain("legacy_loans")

    const reviewedNoLoans = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 12,
        appliedBackfillMembers: 12,
        businessProfitPools: 1,
        chargeScheduleVersions: 2,
        initialMigrationStatus: null,
        legacyLoanReviewMarkers: 1,
        legacyLoans: 0,
        memberProfiles: 12,
        shareCapitalPlans: 1,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }) as never
    )

    expect(reviewedNoLoans.snapshot.status).toBe("migration_review")
    expect(reviewedNoLoans.snapshot.missingStepKeys).toEqual(["finalization"])
  })

  test("does not require business profit pools before migration review", async () => {
    const missingReview = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 12,
        appliedBackfillMembers: 12,
        businessProfitPools: 0,
        chargeScheduleVersions: 2,
        initialMigrationStatus: null,
        legacyLoans: 1,
        memberProfiles: 12,
        shareCapitalPlans: 1,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }) as never
    )

    expect(missingReview.snapshot.status).toBe("migration_review")
    expect(missingReview.snapshot.missingStepKeys).toEqual(["finalization"])

    const reviewedNoProfitPools = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 12,
        appliedBackfillMembers: 12,
        businessProfitPools: 0,
        businessProfitReviewMarkers: 1,
        chargeScheduleVersions: 2,
        initialMigrationStatus: null,
        legacyLoans: 1,
        memberProfiles: 12,
        shareCapitalPlans: 1,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }) as never
    )

    expect(reviewedNoProfitPools.snapshot.status).toBe("migration_review")
    expect(reviewedNoProfitPools.snapshot.missingStepKeys).toEqual([
      "finalization",
    ])
  })

  test("uses applied month ledger members as migration review evidence", async () => {
    const currentMonth = new Date()
    const memberJoinedAt = new Date(
      Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1)
    )
    const state = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 0,
        appliedBackfillMonthMembers: 12,
        businessProfitPools: 1,
        chargeScheduleVersions: 2,
        initialMigrationStatus: null,
        legacyLoans: 1,
        memberJoinedAt,
        memberProfiles: 12,
        shareCapitalPlans: 1,
        startDate: memberJoinedAt,
      }) as never
    )

    expect(state.counts.appliedBackfillMonths).toBe(12)
    expect(state.counts.appliedBackfillMembers).toBe(12)
    expect(state.snapshot.status).toBe("migration_review")
  })

  test("does not treat partial applied month coverage as completed member backfill", async () => {
    const state = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 0,
        appliedBackfillMonthMembers: 12,
        businessProfitPools: 1,
        chargeScheduleVersions: 2,
        initialMigrationStatus: null,
        legacyLoans: 1,
        memberJoinedAt: new Date("2025-01-01T00:00:00.000Z"),
        memberProfiles: 12,
        shareCapitalPlans: 1,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }) as never
    )

    expect(state.counts.appliedBackfillMembers).toBe(0)
    expect(state.snapshot.status).toBe("member_migration_in_progress")
    expect(state.snapshot.missingStepKeys).toContain("member_ledger_backfill")
  })

  test("locks migration tools after live operations begin", async () => {
    const state = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 3,
        appliedBackfillMembers: 12,
        businessProfitPools: 1,
        chargeScheduleVersions: 2,
        initialMigrationStatus: "live_operations",
        legacyLoans: 1,
        memberProfiles: 12,
        migrationFinalizedAt: new Date("2025-05-01T00:00:00.000Z"),
        shareCapitalPlans: 1,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }) as never
    )

    expect(state.snapshot.status).toBe("live_operations")
    expect(state.snapshot.canUseMigrationTools).toBe(false)
    expect(state.snapshot.canUseLiveFinancialWrites).toBe(true)
  })

  test("allows temporary emergency unlock after live operations begin", async () => {
    const state = await getTenantInitialMigrationState(
      "tenant-1",
      createMigrationStatePrismaStub({
        appliedBackfillBatches: 3,
        appliedBackfillMembers: 12,
        businessProfitPools: 1,
        chargeScheduleVersions: 2,
        initialMigrationStatus: "live_operations",
        legacyLoans: 1,
        memberProfiles: 12,
        migrationEmergencyUnlockUntil: new Date(Date.now() + 60_000),
        migrationFinalizedAt: new Date("2025-05-01T00:00:00.000Z"),
        shareCapitalPlans: 1,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }) as never
    )

    expect(state.snapshot.emergencyUnlockActive).toBe(true)
    expect(state.snapshot.canUseMigrationTools).toBe(true)
  })

  test("persists finalization and emergency unlock lifecycle changes", async () => {
    const prisma = createMigrationStatePrismaStub({
      appliedBackfillBatches: 12,
      appliedBackfillMembers: 12,
      businessProfitPools: 1,
      chargeScheduleVersions: 2,
      legacyLoans: 1,
      memberProfiles: 12,
      shareCapitalPlans: 1,
      startDate: new Date("2025-01-01T00:00:00.000Z"),
    })

    await finalizeTenantInitialMigration(
      { actorUserId: "user-1", tenantId: "tenant-1" },
      prisma as never
    )
    await setTenantInitialMigrationEmergencyUnlock(
      {
        actorUserId: "user-2",
        reason: "Board-approved migration correction",
        tenantId: "tenant-1",
        unlockUntil: new Date("2099-06-01T00:00:00.000Z"),
      },
      prisma as never
    )

    expect(prisma.tenantUpdateCalls).toHaveLength(2)
    expect(prisma.tenantUpdateCalls[0]).toMatchObject({
      data: {
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockReason: null,
        migrationEmergencyUnlockedByUserId: null,
        migrationFinalizedByUserId: "user-1",
      },
      where: { id: "tenant-1" },
    })
    expect(prisma.tenantUpdateCalls[1]).toMatchObject({
      data: {
        migrationEmergencyUnlockReason: "Board-approved migration correction",
        migrationEmergencyUnlockedByUserId: "user-2",
      },
      where: { id: "tenant-1" },
    })
    expect(prisma.auditLogCreates).toHaveLength(2)
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.initial.finalized",
        actorUserId: "user-1",
        entityId: "tenant-1",
        entityType: "Tenant",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.auditLogCreates[1]).toMatchObject({
      data: {
        action: "migration.initial.emergency_unlocked",
        actorUserId: "user-2",
        entityId: "tenant-1",
        entityType: "Tenant",
        tenantId: "tenant-1",
      },
    })
  })

  test("blocks emergency unlock before migration finalization", async () => {
    const prisma = createMigrationStatePrismaStub({
      appliedBackfillBatches: 0,
      businessProfitPools: 1,
      chargeScheduleVersions: 2,
      legacyLoans: 1,
      memberProfiles: 12,
      shareCapitalPlans: 1,
      startDate: new Date("2025-01-01T00:00:00.000Z"),
    })

    await expect(
      setTenantInitialMigrationEmergencyUnlock(
        {
          actorUserId: "user-2",
          reason: "Premature unlock",
          tenantId: "tenant-1",
          unlockUntil: new Date("2099-06-01T00:00:00.000Z"),
        },
        prisma as never
      )
    ).rejects.toThrow("only available after initial migration")
    expect(prisma.tenantUpdateCalls).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })

  test("blocks repeated finalization after live operations begin", async () => {
    const prisma = createMigrationStatePrismaStub({
      appliedBackfillBatches: 12,
      appliedBackfillMembers: 12,
      businessProfitPools: 1,
      chargeScheduleVersions: 2,
      initialMigrationStatus: "live_operations",
      legacyLoans: 1,
      memberProfiles: 12,
      shareCapitalPlans: 1,
      startDate: new Date("2025-01-01T00:00:00.000Z"),
    })

    await expect(
      finalizeTenantInitialMigration(
        { actorUserId: "user-1", tenantId: "tenant-1" },
        prisma as never
      )
    ).rejects.toThrow("already been finalized")
    expect(prisma.tenantUpdateCalls).toHaveLength(0)
  })

  test("blocks finalization when required migration evidence is missing", async () => {
    const prisma = createMigrationStatePrismaStub({
      appliedBackfillBatches: 0,
      businessProfitPools: 1,
      chargeScheduleVersions: 2,
      legacyLoans: 1,
      memberProfiles: 12,
      shareCapitalPlans: 1,
      startDate: new Date("2025-01-01T00:00:00.000Z"),
    })

    await expect(
      finalizeTenantInitialMigration(
        { actorUserId: "user-1", tenantId: "tenant-1" },
        prisma as never
      )
    ).rejects.toThrow("member_ledger_backfill")
    expect(prisma.tenantUpdateCalls).toHaveLength(0)
  })

  test("records an audited no-legacy-loans review marker", async () => {
    const prisma = createMigrationStatePrismaStub({
      appliedBackfillBatches: 0,
      businessProfitPools: 1,
      chargeScheduleVersions: 2,
      legacyLoans: 0,
      memberProfiles: 12,
      shareCapitalPlans: 1,
      startDate: new Date("2025-01-01T00:00:00.000Z"),
    })

    await markTenantLegacyLoansReviewed(
      {
        actorUserId: "user-1",
        notes: "Board confirmed no active legacy loans.",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.legacy_loans.reviewed",
        actorUserId: "user-1",
        entityId: "tenant-1",
        entityType: "Tenant",
        metadata: {
          notes: "Board confirmed no active legacy loans.",
          reviewedAsNoLegacyLoans: true,
        },
      },
    })
  })

  test("records an audited no-business-profit-pools review marker", async () => {
    const prisma = createMigrationStatePrismaStub({
      appliedBackfillBatches: 0,
      businessProfitPools: 0,
      chargeScheduleVersions: 2,
      legacyLoans: 1,
      memberProfiles: 12,
      shareCapitalPlans: 1,
      startDate: new Date("2025-01-01T00:00:00.000Z"),
    })

    await markTenantBusinessProfitPoolsReviewed(
      {
        actorUserId: "user-1",
        notes: "Board confirmed no historical business profit pools.",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.business_profit_pools.reviewed",
        actorUserId: "user-1",
        entityId: "tenant-1",
        entityType: "Tenant",
        tenantId: "tenant-1",
      },
    })
  })

  test("blocks no-legacy-loans review marker after member backfill starts", async () => {
    const prisma = createMigrationStatePrismaStub({
      appliedBackfillBatches: 1,
      businessProfitPools: 1,
      chargeScheduleVersions: 2,
      legacyLoans: 0,
      memberProfiles: 12,
      shareCapitalPlans: 1,
      startDate: new Date("2025-01-01T00:00:00.000Z"),
    })

    await expect(
      markTenantLegacyLoansReviewed(
        {
          actorUserId: "user-1",
          notes: "Board confirmed no active legacy loans.",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Legacy loan review is locked")

    expect(prisma.auditLogCreates).toHaveLength(0)
  })

  test("blocks no-business-profit-pools review marker after member backfill starts", async () => {
    const prisma = createMigrationStatePrismaStub({
      appliedBackfillBatches: 1,
      businessProfitPools: 0,
      chargeScheduleVersions: 2,
      legacyLoans: 1,
      memberProfiles: 12,
      shareCapitalPlans: 1,
      startDate: new Date("2025-01-01T00:00:00.000Z"),
    })

    await expect(
      markTenantBusinessProfitPoolsReviewed(
        {
          actorUserId: "user-1",
          notes: "Board confirmed no historical business profit pools.",
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Business profit pool review is locked")

    expect(prisma.auditLogCreates).toHaveLength(0)
  })
})
