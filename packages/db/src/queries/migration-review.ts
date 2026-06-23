import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"

export type InitialMigrationMemberReviewStatus =
  | "profile_only"
  | "configured"
  | "backfill_draft"
  | "backfill_applied"

export type InitialMigrationMemberReviewRow = {
  appliedBackfillBatches: number
  appliedBackfillMonths: number
  backfillDraftBatches: number
  fullName: string
  id: string
  joinedAt: Date
  legacyLoanDrafts: number
  memberNumber: string
  rowAdjustments: number
  profitAdjustments: number
  status: InitialMigrationMemberReviewStatus
}

function countByMemberId(rows: Array<{ memberId: string }>) {
  return rows.reduce((counts, row) => {
    counts.set(row.memberId, (counts.get(row.memberId) ?? 0) + 1)
    return counts
  }, new Map<string, number>())
}

function toMemberReviewRow(input: {
  appliedBackfillBatches: number
  appliedBackfillMonths: number
  backfillDraftBatches: number
  fullName: string
  id: string
  joinedAt: Date
  legacyLoanDrafts: number
  memberNumber: string
  profitAdjustments: number
  rowAdjustments: number
}): InitialMigrationMemberReviewRow {
  const hasMigrationConfig =
    input.legacyLoanDrafts > 0 ||
    input.rowAdjustments > 0 ||
    input.profitAdjustments > 0
  const status: InitialMigrationMemberReviewStatus =
    input.appliedBackfillBatches > 0 || input.appliedBackfillMonths > 0
      ? "backfill_applied"
      : input.backfillDraftBatches > 0
        ? "backfill_draft"
        : hasMigrationConfig
          ? "configured"
          : "profile_only"

  return {
    ...input,
    status,
  }
}

export async function getInitialMigrationMemberReview(
  input: {
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
): Promise<InitialMigrationMemberReviewRow | null> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return null

  const [
    member,
    legacyLoanDrafts,
    rowAdjustments,
    profitAdjustments,
    appliedBackfillBatches,
    backfillDraftBatches,
    appliedBackfillMonths,
  ] = await Promise.all([
    prisma.member.findFirst({
      select: {
        fullName: true,
        id: true,
        joinedAt: true,
        memberNumber: true,
      },
      where: {
        id: input.memberId,
        tenantId: input.tenantId,
      },
    }),
    typeof prisma.legacyLoanMigrationDraft?.count === "function"
      ? prisma.legacyLoanMigrationDraft.count({
          where: {
            memberId: input.memberId,
            tenantId: input.tenantId,
          },
        })
      : 0,
    typeof prisma.migrationBackfillAdjustment?.count === "function"
      ? prisma.migrationBackfillAdjustment.count({
          where: {
            memberId: input.memberId,
            tenantId: input.tenantId,
          },
        })
      : 0,
    typeof prisma.migrationProfitAdjustment?.count === "function"
      ? prisma.migrationProfitAdjustment.count({
          where: {
            memberId: input.memberId,
            tenantId: input.tenantId,
          },
        })
      : 0,
    prisma.backfillBatch.count({
      where: {
        memberId: input.memberId,
        status: "applied",
        tenantId: input.tenantId,
      },
    }),
    prisma.backfillBatch.count({
      where: {
        memberId: input.memberId,
        status: {
          not: "applied",
        },
        tenantId: input.tenantId,
      },
    }),
    typeof prisma.appliedBackfillMonth?.count === "function"
      ? prisma.appliedBackfillMonth.count({
          where: {
            memberId: input.memberId,
            tenantId: input.tenantId,
          },
        })
      : 0,
  ])

  if (!member) {
    return null
  }

  return toMemberReviewRow({
    appliedBackfillBatches,
    appliedBackfillMonths,
    backfillDraftBatches,
    fullName: member.fullName,
    id: member.id,
    joinedAt: member.joinedAt,
    legacyLoanDrafts,
    memberNumber: member.memberNumber,
    profitAdjustments,
    rowAdjustments,
  })
}

export async function listInitialMigrationMemberReview(
  tenantId: string,
  prismaOverride?: PrismaClient,
): Promise<InitialMigrationMemberReviewRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  const [
    members,
    legacyLoans,
    rowAdjustments,
    profitAdjustments,
    backfillBatches,
    appliedBackfillMonths,
  ] = await Promise.all([
    prisma.member.findMany({
      orderBy: [{ memberNumber: "asc" }],
      select: {
        fullName: true,
        id: true,
        joinedAt: true,
        memberNumber: true,
      },
      take: 250,
      where: { tenantId },
    }),
    typeof prisma.legacyLoanMigrationDraft?.findMany === "function"
      ? prisma.legacyLoanMigrationDraft.findMany({
          select: { memberId: true },
          where: { tenantId },
        })
      : [],
    typeof prisma.migrationBackfillAdjustment?.findMany === "function"
      ? prisma.migrationBackfillAdjustment.findMany({
          select: { memberId: true },
          where: { tenantId },
        })
      : [],
    typeof prisma.migrationProfitAdjustment?.findMany === "function"
      ? prisma.migrationProfitAdjustment.findMany({
          select: { memberId: true },
          where: { tenantId },
        })
      : [],
    prisma.backfillBatch.findMany({
      select: {
        memberId: true,
        status: true,
      },
      where: { tenantId },
    }),
    typeof prisma.appliedBackfillMonth?.findMany === "function"
      ? prisma.appliedBackfillMonth.findMany({
          select: { memberId: true },
          where: { tenantId },
        })
      : [],
  ])

  const legacyLoanCounts = countByMemberId(legacyLoans)
  const rowAdjustmentCounts = countByMemberId(rowAdjustments)
  const profitAdjustmentCounts = countByMemberId(profitAdjustments)
  const appliedBackfillCounts = countByMemberId(
    backfillBatches.filter((batch: any) => batch.status === "applied"),
  )
  const appliedBackfillMonthCounts = countByMemberId(appliedBackfillMonths)
  const draftBackfillCounts = countByMemberId(
    backfillBatches.filter((batch: any) => batch.status !== "applied"),
  )

  return members.map((member: any) => {
    return toMemberReviewRow({
      appliedBackfillBatches: appliedBackfillCounts.get(member.id) ?? 0,
      appliedBackfillMonths: appliedBackfillMonthCounts.get(member.id) ?? 0,
      backfillDraftBatches: draftBackfillCounts.get(member.id) ?? 0,
      fullName: member.fullName,
      id: member.id,
      joinedAt: member.joinedAt,
      legacyLoanDrafts: legacyLoanCounts.get(member.id) ?? 0,
      memberNumber: member.memberNumber,
      profitAdjustments: profitAdjustmentCounts.get(member.id) ?? 0,
      rowAdjustments: rowAdjustmentCounts.get(member.id) ?? 0,
    })
  })
}
