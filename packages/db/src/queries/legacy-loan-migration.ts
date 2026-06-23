import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { getTenantInitialMigrationState } from "./migration"

export type LegacyLoanMigrationDraftRow = {
  closedAt: Date | null
  guarantorOneMemberId: string | null
  guarantorTwoMemberId: string | null
  id: string
  loanLabel: string
  member: {
    fullName: string
    memberNumber: string
  }
  memberId: string
  notes: string | null
  openedAt: Date
  outstandingPrincipalBalance: number
  principalAmount: number
  savingsDuringLoan: number
  scheduledMonthlyPrincipalRepayment: number
}

type LegacyLoanMigrationDraftInput = {
  closedAt?: Date | null
  guarantorOneMemberId?: string | null
  guarantorTwoMemberId?: string | null
  loanLabel: string
  memberId: string
  notes?: string | null
  openedAt: Date
  outstandingPrincipalBalance: number
  principalAmount: number
  savingsDuringLoan: number
  scheduledMonthlyPrincipalRepayment: number
  tenantId: string
}

function validateLegacyLoanMigrationDraftInput(
  input: LegacyLoanMigrationDraftInput
) {
  if (input.principalAmount <= 0) {
    throw new Error("Principal amount must be greater than 0.")
  }

  if (input.scheduledMonthlyPrincipalRepayment <= 0) {
    throw new Error("Monthly principal repayment must be greater than 0.")
  }

  if (input.savingsDuringLoan < 0) {
    throw new Error("Savings during loan cannot be negative.")
  }

  if (
    input.outstandingPrincipalBalance < 0 ||
    input.outstandingPrincipalBalance > input.principalAmount
  ) {
    throw new Error(
      "Outstanding principal balance must be between 0 and the principal amount."
    )
  }

  if (input.closedAt && input.closedAt < input.openedAt) {
    throw new Error("Closed date cannot be before the loan date.")
  }

  if (
    input.guarantorOneMemberId &&
    input.guarantorOneMemberId === input.memberId
  ) {
    throw new Error("Guarantor 1 cannot be the borrowing member.")
  }

  if (
    input.guarantorTwoMemberId &&
    input.guarantorTwoMemberId === input.memberId
  ) {
    throw new Error("Guarantor 2 cannot be the borrowing member.")
  }

  if (
    input.guarantorOneMemberId &&
    input.guarantorTwoMemberId &&
    input.guarantorOneMemberId === input.guarantorTwoMemberId
  ) {
    throw new Error("Guarantor 1 and guarantor 2 must be different members.")
  }
}

async function assertLegacyLoanMigrationDraftMutationOpen(
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
      "Legacy loan migration drafts are locked because initial migration is finalized."
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
      "This member's historical ledger has already been applied. Use correction workflows instead of migration draft edits."
    )
  }
}

export async function listLegacyLoanMigrationDrafts(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<LegacyLoanMigrationDraftRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (typeof prisma.legacyLoanMigrationDraft?.findMany !== "function") {
    return []
  }

  const rows = await prisma.legacyLoanMigrationDraft.findMany({
    include: {
      member: {
        select: {
          fullName: true,
          memberNumber: true,
        },
      },
    },
    orderBy: [{ openedAt: "asc" }, { createdAt: "asc" }],
    where: { tenantId },
  })

  return rows.map((row: any) => ({
    closedAt: row.closedAt,
    guarantorOneMemberId: row.guarantorOneMemberId ?? null,
    guarantorTwoMemberId: row.guarantorTwoMemberId ?? null,
    id: row.id,
    loanLabel: row.loanLabel,
    member: row.member,
    memberId: row.memberId,
    notes: row.notes,
    openedAt: row.openedAt,
    outstandingPrincipalBalance: Number(row.outstandingPrincipalBalance),
    principalAmount: Number(row.principalAmount),
    savingsDuringLoan: Number(row.savingsDuringLoan),
    scheduledMonthlyPrincipalRepayment: Number(
      row.scheduledMonthlyPrincipalRepayment
    ),
  }))
}

export async function createLegacyLoanMigrationDraft(
  input: LegacyLoanMigrationDraftInput & {
    actorUserId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (typeof prisma.legacyLoanMigrationDraft?.create !== "function") {
    throw new Error(
      "Legacy loan migration drafts require the latest Prisma migration and generated client."
    )
  }

  validateLegacyLoanMigrationDraftInput(input)
  await assertLegacyLoanMigrationDraftMutationOpen(input, prisma)

  const created = await prisma.legacyLoanMigrationDraft.create({
    data: {
      closedAt: input.closedAt ?? null,
      createdByUserId: input.actorUserId,
      guarantorOneMemberId: input.guarantorOneMemberId ?? null,
      guarantorTwoMemberId: input.guarantorTwoMemberId ?? null,
      loanLabel: input.loanLabel,
      memberId: input.memberId,
      notes: input.notes?.trim() || null,
      openedAt: input.openedAt,
      outstandingPrincipalBalance: input.outstandingPrincipalBalance,
      principalAmount: input.principalAmount,
      savingsDuringLoan: input.savingsDuringLoan,
      scheduledMonthlyPrincipalRepayment:
        input.scheduledMonthlyPrincipalRepayment,
      tenantId: input.tenantId,
    },
  })

  await createAuditLogEntry(
    {
      action: "migration.legacy_loan_draft.created",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: created.id,
      entityType: "LegacyLoanMigrationDraft",
      metadata: {
        guarantorOneMemberId: input.guarantorOneMemberId ?? null,
        guarantorTwoMemberId: input.guarantorTwoMemberId ?? null,
        memberId: input.memberId,
        openedAt: input.openedAt.toISOString(),
        outstandingPrincipalBalance: input.outstandingPrincipalBalance,
        principalAmount: input.principalAmount,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return created
}

export async function updateLegacyLoanMigrationDraft(
  input: LegacyLoanMigrationDraftInput & {
    actorUserId: string
    draftId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (
    typeof prisma.legacyLoanMigrationDraft?.findFirst !== "function" ||
    typeof prisma.legacyLoanMigrationDraft?.update !== "function"
  ) {
    throw new Error(
      "Legacy loan migration draft updates require the latest Prisma migration and generated client."
    )
  }

  validateLegacyLoanMigrationDraftInput(input)
  await assertLegacyLoanMigrationDraftMutationOpen(input, prisma)

  const existing = await prisma.legacyLoanMigrationDraft.findFirst({
    where: {
      id: input.draftId,
      memberId: input.memberId,
      tenantId: input.tenantId,
    },
  })

  if (!existing) {
    throw new Error("Legacy loan migration draft not found.")
  }

  const updated = await prisma.legacyLoanMigrationDraft.update({
    data: {
      closedAt: input.closedAt ?? null,
      guarantorOneMemberId: input.guarantorOneMemberId ?? null,
      guarantorTwoMemberId: input.guarantorTwoMemberId ?? null,
      loanLabel: input.loanLabel,
      notes: input.notes?.trim() || null,
      openedAt: input.openedAt,
      outstandingPrincipalBalance: input.outstandingPrincipalBalance,
      principalAmount: input.principalAmount,
      savingsDuringLoan: input.savingsDuringLoan,
      scheduledMonthlyPrincipalRepayment:
        input.scheduledMonthlyPrincipalRepayment,
    },
    where: { id: input.draftId },
  })

  await createAuditLogEntry(
    {
      action: "migration.legacy_loan_draft.updated",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.draftId,
      entityType: "LegacyLoanMigrationDraft",
      metadata: {
        after: {
          closedAt: input.closedAt?.toISOString() ?? null,
          guarantorOneMemberId: input.guarantorOneMemberId ?? null,
          guarantorTwoMemberId: input.guarantorTwoMemberId ?? null,
          loanLabel: input.loanLabel,
          openedAt: input.openedAt.toISOString(),
          outstandingPrincipalBalance: input.outstandingPrincipalBalance,
          principalAmount: input.principalAmount,
          savingsDuringLoan: input.savingsDuringLoan,
          scheduledMonthlyPrincipalRepayment:
            input.scheduledMonthlyPrincipalRepayment,
        },
        before: {
          closedAt: existing.closedAt?.toISOString?.() ?? null,
          guarantorOneMemberId: existing.guarantorOneMemberId ?? null,
          guarantorTwoMemberId: existing.guarantorTwoMemberId ?? null,
          loanLabel: existing.loanLabel,
          openedAt: existing.openedAt?.toISOString?.() ?? null,
          outstandingPrincipalBalance: Number(
            existing.outstandingPrincipalBalance
          ),
          principalAmount: Number(existing.principalAmount),
          savingsDuringLoan: Number(existing.savingsDuringLoan),
          scheduledMonthlyPrincipalRepayment: Number(
            existing.scheduledMonthlyPrincipalRepayment
          ),
        },
        memberId: input.memberId,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return updated
}
