import type { PrismaClient } from "@prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { getTenantInitialMigrationState } from "./migration"

function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

async function assertMigrationAdjustmentMutationOpen(
  input: {
    memberId: string
    tenantId: string
  },
  prisma: PrismaClient,
) {
  const migrationState = await getTenantInitialMigrationState(
    input.tenantId,
    prisma,
  )

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw new Error(
      "Migration adjustments are locked because initial migration is finalized.",
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
      "This member's historical ledger has already been applied. Use correction workflows instead of migration adjustment edits.",
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
    savingsContribution?: number | null
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertMigrationAdjustmentMutationOpen(input, prisma)

  if (typeof prisma.migrationBackfillAdjustment?.upsert !== "function") {
    throw new Error("Migration backfill adjustments require the latest Prisma migration and generated client.")
  }

  if (
    input.savingsContribution == null &&
    input.loanRepaymentAmount == null &&
    input.loanRepaymentOnTime == null
  ) {
    throw new Error("Set a savings contribution, loan repayment amount, or loan repayment status adjustment.")
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

  await createAuditLogEntry({
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
      savingsContribution: input.savingsContribution ?? null,
    },
    tenantId: input.tenantId,
  }, prisma)

  return adjustment
}
