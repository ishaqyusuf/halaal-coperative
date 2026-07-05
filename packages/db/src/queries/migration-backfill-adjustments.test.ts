import { describe, expect, test } from "bun:test"
import { upsertMigrationBackfillAdjustment } from "./migration-backfill-adjustments"

function createAdjustmentPrismaStub({
  appliedBackfillMonths = 0,
  initialMigrationStatus = "historical_setup_in_progress",
}: {
  appliedBackfillMonths?: number
  initialMigrationStatus?: string
} = {}) {
  const auditLogCreates: unknown[] = []
  const adjustmentUpserts: unknown[] = []

  return {
    appliedBackfillMonth: {
      findMany: async (input?: unknown) => {
        if (
          input &&
          typeof input === "object" &&
          "take" in input &&
          appliedBackfillMonths > 0
        ) {
          return [{ id: "applied-month-1" }]
        }

        return []
      },
    },
    auditLog: {
      count: async () => 0,
      create: async (input: unknown) => {
        auditLogCreates.push(input)
        return input
      },
    },
    auditLogCreates,
    adjustmentUpserts,
    backfillBatch: {
      count: async () => 0,
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
    migrationBackfillAdjustment: {
      upsert: async (input: any) => {
        adjustmentUpserts.push(input)
        return { id: "adjustment-1", ...input.create }
      },
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
}

describe("migration backfill adjustments", () => {
  test("requires at least one override value", async () => {
    await expect(
      upsertMigrationBackfillAdjustment(
        {
          actorUserId: "user-1",
          memberId: "member-1",
          month: new Date("2025-09-10T00:00:00.000Z"),
          tenantId: "tenant-1",
        },
        createAdjustmentPrismaStub() as never
      )
    ).rejects.toThrow(
      "Set a savings contribution, loan repayment amount, loan repayment status, or row status adjustment."
    )
  })

  test("upserts and audits an adjustment by member month", async () => {
    const prisma = createAdjustmentPrismaStub()

    await upsertMigrationBackfillAdjustment(
      {
        actorUserId: "user-1",
        loanRepaymentOnTime: true,
        loanRepaymentAmount: 900,
        memberId: "member-1",
        month: new Date("2025-09-10T00:00:00.000Z"),
        notes: "Catch-up",
        rowStatus: null,
        savingsContribution: 1000,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.adjustmentUpserts[0]).toMatchObject({
      create: {
        loanRepaymentOnTime: true,
        loanRepaymentAmount: 900,
        memberId: "member-1",
        notes: "Catch-up",
        savingsContribution: 1000,
        tenantId: "tenant-1",
      },
      where: {
        tenantId_memberId_month: {
          memberId: "member-1",
          tenantId: "tenant-1",
        },
      },
    })
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.backfill_adjustment.upserted",
        entityId: "adjustment-1",
        entityType: "MigrationBackfillAdjustment",
      },
    })
  })

  test("allows adjustment edits after setup finalization before member backfill is applied", async () => {
    const prisma = createAdjustmentPrismaStub({
      initialMigrationStatus: "finalized",
    })

    await upsertMigrationBackfillAdjustment(
      {
        actorUserId: "user-1",
        memberId: "member-1",
        month: new Date("2025-09-10T00:00:00.000Z"),
        savingsContribution: 1000,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.adjustmentUpserts).toHaveLength(1)
    expect(prisma.auditLogCreates).toHaveLength(1)
  })

  test("blocks adjustment edits after the member ledger is applied", async () => {
    const prisma = createAdjustmentPrismaStub({
      appliedBackfillMonths: 1,
    })

    await expect(
      upsertMigrationBackfillAdjustment(
        {
          actorUserId: "user-1",
          memberId: "member-1",
          month: new Date("2025-09-10T00:00:00.000Z"),
          savingsContribution: 1000,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("historical ledger has already been applied")

    expect(prisma.adjustmentUpserts).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })
})
