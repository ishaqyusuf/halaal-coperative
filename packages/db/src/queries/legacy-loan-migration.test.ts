import { describe, expect, test } from "bun:test"
import {
  createLegacyLoanMigrationDraft,
  listLegacyLoanMigrationDrafts,
  updateLegacyLoanMigrationDraft,
} from "./legacy-loan-migration"

function createLegacyLoanDraftPrismaStub({
  appliedBackfillBatches = 0,
  appliedBackfillMonths = 0,
  initialMigrationStatus = "historical_setup_in_progress",
}: {
  appliedBackfillBatches?: number
  appliedBackfillMonths?: number
  initialMigrationStatus?: string
} = {}) {
  const auditLogCreates: unknown[] = []
  const draftCreates: unknown[] = []
  const draftUpdates: unknown[] = []
  const rows = [
    {
      closedAt: null,
      id: "draft-1",
      loanLabel: "Loan A",
      member: {
        fullName: "Aisha Bello",
        memberNumber: "MBR-001",
      },
      memberId: "member-1",
      notes: "Imported from paper ledger",
      openedAt: new Date("2025-08-01T00:00:00.000Z"),
      outstandingPrincipalBalance: 65000,
      principalAmount: 120000,
      savingsDuringLoan: 5000,
      scheduledMonthlyPrincipalRepayment: 10000,
    },
  ]

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
    backfillBatch: {
      count: async () => appliedBackfillBatches,
      findMany: async (input?: unknown) => {
        if (
          input &&
          typeof input === "object" &&
          "take" in input &&
          appliedBackfillBatches > 0
        ) {
          return [{ id: "backfill-batch-1" }]
        }

        return []
      },
    },
    chargeDefinitionVersion: {
      count: async () => 1,
    },
    draftCreates,
    draftUpdates,
    legacyLoanMigrationDraft: {
      count: async () => 1,
      create: async (input: any) => {
        draftCreates.push(input)
        return { id: "draft-2", ...input.data }
      },
      findFirst: async (input: any) => {
        if (
          input.where.id === "draft-1" &&
          input.where.memberId === "member-1" &&
          input.where.tenantId === "tenant-1"
        ) {
          return rows[0]
        }

        return null
      },
      findMany: async () => rows,
      update: async (input: any) => {
        draftUpdates.push(input)
        return { id: "draft-1", ...input.data }
      },
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
}

describe("legacy loan migration drafts", () => {
  test("lists principal-only legacy loan draft rows", async () => {
    const rows = await listLegacyLoanMigrationDrafts(
      "tenant-1",
      createLegacyLoanDraftPrismaStub() as never
    )

    expect(rows).toEqual([
      {
        closedAt: null,
        guarantorOneMemberId: null,
        guarantorTwoMemberId: null,
        id: "draft-1",
        loanLabel: "Loan A",
        member: {
          fullName: "Aisha Bello",
          memberNumber: "MBR-001",
        },
        memberId: "member-1",
        notes: "Imported from paper ledger",
        openedAt: new Date("2025-08-01T00:00:00.000Z"),
        outstandingPrincipalBalance: 65000,
        principalAmount: 120000,
        savingsDuringLoan: 5000,
        scheduledMonthlyPrincipalRepayment: 10000,
      },
    ])
  })

  test("rejects outstanding balance above principal", async () => {
    await expect(
      createLegacyLoanMigrationDraft(
        {
          actorUserId: "user-1",
          loanLabel: "Loan A",
          memberId: "member-1",
          openedAt: new Date("2025-08-01T00:00:00.000Z"),
          outstandingPrincipalBalance: 121000,
          principalAmount: 120000,
          savingsDuringLoan: 5000,
          scheduledMonthlyPrincipalRepayment: 10000,
          tenantId: "tenant-1",
        },
        createLegacyLoanDraftPrismaStub() as never
      )
    ).rejects.toThrow(
      "Outstanding principal balance must be between 0 and the principal amount."
    )
  })

  test("creates and audits a legacy loan migration draft", async () => {
    const prisma = createLegacyLoanDraftPrismaStub()

    await createLegacyLoanMigrationDraft(
      {
        actorUserId: "user-1",
        loanLabel: "Loan A",
        memberId: "member-1",
        notes: "Board verified",
        openedAt: new Date("2025-08-01T00:00:00.000Z"),
        outstandingPrincipalBalance: 65000,
        principalAmount: 120000,
        savingsDuringLoan: 5000,
        scheduledMonthlyPrincipalRepayment: 10000,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.draftCreates).toHaveLength(1)
    expect(prisma.draftCreates[0]).toMatchObject({
      data: {
        loanLabel: "Loan A",
        memberId: "member-1",
        outstandingPrincipalBalance: 65000,
        principalAmount: 120000,
        savingsDuringLoan: 5000,
        scheduledMonthlyPrincipalRepayment: 10000,
      },
    })
    expect(prisma.auditLogCreates).toHaveLength(1)
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.legacy_loan_draft.created",
        entityId: "draft-2",
        entityType: "LegacyLoanMigrationDraft",
      },
    })
  })

  test("updates and audits a legacy loan migration draft", async () => {
    const prisma = createLegacyLoanDraftPrismaStub()

    await updateLegacyLoanMigrationDraft(
      {
        actorUserId: "user-1",
        draftId: "draft-1",
        loanLabel: "Loan A corrected",
        memberId: "member-1",
        notes: "Corrected after review",
        openedAt: new Date("2025-08-01T00:00:00.000Z"),
        outstandingPrincipalBalance: 60000,
        principalAmount: 120000,
        savingsDuringLoan: 5500,
        scheduledMonthlyPrincipalRepayment: 10000,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.draftUpdates).toHaveLength(1)
    expect(prisma.draftUpdates[0]).toMatchObject({
      data: {
        loanLabel: "Loan A corrected",
        outstandingPrincipalBalance: 60000,
        savingsDuringLoan: 5500,
      },
      where: { id: "draft-1" },
    })
    expect(prisma.auditLogCreates).toHaveLength(1)
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.legacy_loan_draft.updated",
        entityId: "draft-1",
        entityType: "LegacyLoanMigrationDraft",
      },
    })
  })

  test("blocks legacy loan draft creation after migration finalization", async () => {
    const prisma = createLegacyLoanDraftPrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await expect(
      createLegacyLoanMigrationDraft(
        {
          actorUserId: "user-1",
          loanLabel: "Loan A",
          memberId: "member-1",
          openedAt: new Date("2025-08-01T00:00:00.000Z"),
          outstandingPrincipalBalance: 65000,
          principalAmount: 120000,
          savingsDuringLoan: 5000,
          scheduledMonthlyPrincipalRepayment: 10000,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Legacy loan migration drafts are locked")

    expect(prisma.draftCreates).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })

  test("blocks legacy loan draft updates after member backfill is applied", async () => {
    const prisma = createLegacyLoanDraftPrismaStub({
      appliedBackfillMonths: 1,
    })

    await expect(
      updateLegacyLoanMigrationDraft(
        {
          actorUserId: "user-1",
          draftId: "draft-1",
          loanLabel: "Loan A corrected",
          memberId: "member-1",
          openedAt: new Date("2025-08-01T00:00:00.000Z"),
          outstandingPrincipalBalance: 60000,
          principalAmount: 120000,
          savingsDuringLoan: 5500,
          scheduledMonthlyPrincipalRepayment: 10000,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("historical ledger has already been applied")

    expect(prisma.draftUpdates).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })

  test("rejects updates when closed date is before loan date", async () => {
    await expect(
      updateLegacyLoanMigrationDraft(
        {
          actorUserId: "user-1",
          closedAt: new Date("2025-07-31T00:00:00.000Z"),
          draftId: "draft-1",
          loanLabel: "Loan A",
          memberId: "member-1",
          openedAt: new Date("2025-08-01T00:00:00.000Z"),
          outstandingPrincipalBalance: 65000,
          principalAmount: 120000,
          savingsDuringLoan: 5000,
          scheduledMonthlyPrincipalRepayment: 10000,
          tenantId: "tenant-1",
        },
        createLegacyLoanDraftPrismaStub() as never
      )
    ).rejects.toThrow("Closed date cannot be before the loan date.")
  })
})
