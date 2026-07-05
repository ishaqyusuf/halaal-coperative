import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { getTenantInitialMigrationState } from "./migration"

type ExistingMigrationBackfillAdjustment = {
  id: string
  loanRepaymentAmount: unknown
  loanRepaymentOnTime: unknown
  month: Date
  notes: string | null
  rowStatus: string | null
  savingsContribution: unknown
}

function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

export async function assertMigrationAdjustmentMutationOpen(
  input: {
    memberId: string
    tenantId: string
  },
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(
    input.tenantId,
    prisma
  )

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw new Error(
      "Migration adjustments are locked because initial migration is finalized."
    )
  }

  const [appliedMonths, appliedBatches] = await Promise.all([
    typeof (prisma as any).appliedBackfillMonth?.findMany === "function"
      ? (prisma as any).appliedBackfillMonth.findMany({
          select: { id: true },
          take: 1,
          where: {
            memberId: input.memberId,
            tenantId: input.tenantId,
          },
        })
      : [],
    typeof (prisma as any).backfillBatch?.findMany === "function"
      ? (prisma as any).backfillBatch.findMany({
          select: { id: true },
          take: 1,
          where: {
            memberId: input.memberId,
            status: "applied",
            tenantId: input.tenantId,
          },
        })
      : [],
  ])

  if (appliedMonths.length > 0 || appliedBatches.length > 0) {
    throw new Error(
      "This member's historical ledger has already been applied. Use correction workflows instead of migration adjustment edits."
    )
  }
}

export async function upsertMigrationBackfillAdjustment(
  input: {
    actorUserId: string
    loanRepaymentOnTime?: boolean | null
    loanRepaymentAmount?: number | null
    memberId: string
    month: Date
    notes?: string | null
    rowStatus?: "active" | "missed" | "paused" | "adjusted" | null
    savingsContribution?: number | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertMigrationAdjustmentMutationOpen(input, prisma)

  if (typeof prisma.migrationBackfillAdjustment?.upsert !== "function") {
    throw new Error(
      "Migration backfill adjustments require the latest Prisma migration and generated client."
    )
  }

  if (
    input.savingsContribution == null &&
    input.loanRepaymentAmount == null &&
    input.loanRepaymentOnTime == null &&
    input.rowStatus == null
  ) {
    throw new Error(
      "Set a savings contribution, loan repayment amount, loan repayment status, or row status adjustment."
    )
  }

  if (input.savingsContribution != null && input.savingsContribution < 0) {
    throw new Error("Savings contribution cannot be negative.")
  }

  if (input.loanRepaymentAmount != null && input.loanRepaymentAmount < 0) {
    throw new Error("Loan repayment amount cannot be negative.")
  }

  const month = startOfMonth(input.month)
  const data = {
    createdByUserId: input.actorUserId,
    loanRepaymentOnTime: input.loanRepaymentOnTime ?? null,
    loanRepaymentAmount: input.loanRepaymentAmount ?? null,
    memberId: input.memberId,
    month,
    notes: input.notes?.trim() || null,
    rowStatus: input.rowStatus ?? null,
    savingsContribution: input.savingsContribution ?? null,
    tenantId: input.tenantId,
  }
  const adjustment = await prisma.migrationBackfillAdjustment.upsert({
    create: data,
    update: data,
    where: {
      tenantId_memberId_month: {
        memberId: input.memberId,
        month,
        tenantId: input.tenantId,
      },
    },
  })

  await createAuditLogEntry(
    {
      action: "migration.backfill_adjustment.upserted",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: adjustment.id,
      entityType: "MigrationBackfillAdjustment",
      metadata: {
        loanRepaymentOnTime: input.loanRepaymentOnTime ?? null,
        loanRepaymentAmount: input.loanRepaymentAmount ?? null,
        memberId: input.memberId,
        month: month.toISOString(),
        rowStatus: input.rowStatus ?? null,
        savingsContribution: input.savingsContribution ?? null,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return adjustment
}

export async function setMigrationBackfillDefaultingMonths(
  input: {
    actorUserId: string
    defaultingMonths: Date[]
    memberId: string
    months: Date[]
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertMigrationAdjustmentMutationOpen(input, prisma)

  if (typeof prisma.migrationBackfillAdjustment?.findMany !== "function") {
    throw new Error(
      "Migration backfill adjustments require the latest Prisma migration and generated client."
    )
  }

  const months = input.months.map(startOfMonth)
  const defaultingMonthKeys = new Set(
    input.defaultingMonths.map((month) => startOfMonth(month).toISOString())
  )

  const existingRows = await prisma.migrationBackfillAdjustment.findMany({
    where: {
      memberId: input.memberId,
      month: { in: months },
      tenantId: input.tenantId,
    },
  })
  const existingByMonth = new Map<string, ExistingMigrationBackfillAdjustment>(
    existingRows.map((row: ExistingMigrationBackfillAdjustment) => [
      startOfMonth(row.month).toISOString(),
      row,
    ])
  )

  const operations = []

  for (const month of months) {
    const monthKey = month.toISOString()
    const existing = existingByMonth.get(monthKey)

    if (defaultingMonthKeys.has(monthKey)) {
      operations.push(
        prisma.migrationBackfillAdjustment.upsert({
          create: {
            createdByUserId: input.actorUserId,
            memberId: input.memberId,
            month,
            notes: existing?.notes ?? "Defaulting month",
            rowStatus: "missed",
            tenantId: input.tenantId,
          },
          update: {
            rowStatus: "missed",
            notes: existing?.notes ?? "Defaulting month",
          },
          where: {
            tenantId_memberId_month: {
              memberId: input.memberId,
              month,
              tenantId: input.tenantId,
            },
          },
        })
      )
      continue
    }

    if (
      existing?.rowStatus === "missed" &&
      existing.savingsContribution == null &&
      existing.loanRepaymentAmount == null &&
      existing.loanRepaymentOnTime == null
    ) {
      operations.push(
        prisma.migrationBackfillAdjustment.delete({
          where: { id: existing.id },
        })
      )
      continue
    }

    if (existing?.rowStatus === "missed") {
      operations.push(
        prisma.migrationBackfillAdjustment.update({
          data: { rowStatus: null },
          where: { id: existing.id },
        })
      )
    }
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations)
  }

  await createAuditLogEntry(
    {
      action: "migration.backfill_defaulting_months.set",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.memberId,
      entityType: "Member",
      metadata: {
        defaultingMonths: input.defaultingMonths.map((month) =>
          startOfMonth(month).toISOString()
        ),
        memberId: input.memberId,
        months: months.map((month) => month.toISOString()),
      },
      tenantId: input.tenantId,
    },
    prisma
  )
}
