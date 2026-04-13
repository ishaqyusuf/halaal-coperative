import { createPrismaClient } from "../prisma.js"
import { postLedgerTransaction } from "./ledger.js"
import { getLedgerAccountByCode } from "./ledger.js"
import type { PrismaClient } from "../generated/prisma/client.js"
import type { ContributionChannel, ContributionStatus } from "../generated/prisma/client.js"

export type ListContributionsFilters = {
  memberId?: string
  status?: ContributionStatus
  fromDate?: Date
  toDate?: Date
  page?: number
  pageSize?: number
}

export async function listContributions(
  tenantId: string,
  filters?: ListContributionsFilters,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 25

  const where = {
    tenantId,
    ...(filters?.memberId && { memberId: filters.memberId }),
    ...(filters?.status && { status: filters.status }),
    ...((filters?.fromDate || filters?.toDate) && {
      postedAt: {
        ...(filters?.fromDate && { gte: filters.fromDate }),
        ...(filters?.toDate && { lte: filters.toDate }),
      },
    }),
  }

  const [items, total] = await Promise.all([
    prisma.contribution.findMany({
      where,
      orderBy: { postedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        member: { select: { id: true, fullName: true, memberNumber: true } },
      },
    }),
    prisma.contribution.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export type RecordContributionInput = {
  tenantId: string
  memberId: string
  amount: number
  channel: ContributionChannel
  postedAt: Date
  contributionPlanId?: string
  periodLabel?: string
  reference?: string
  notes?: string
  actorUserId: string
}

export async function recordContribution(
  input: RecordContributionInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const cashAccount = await getLedgerAccountByCode(input.tenantId, "2000", prisma)
  const savingsAccount = await getLedgerAccountByCode(input.tenantId, "1000", prisma)

  if (!cashAccount || !savingsAccount) {
    throw new Error("Ledger accounts not initialized for this tenant")
  }

  return prisma.$transaction(async (tx) => {
    const contribution = await tx.contribution.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        amount: input.amount,
        channel: input.channel,
        postedAt: input.postedAt,
        status: "posted",
        contributionPlanId: input.contributionPlanId,
        periodLabel: input.periodLabel,
        reference: input.reference,
        notes: input.notes,
      },
    })

    // Post ledger: debit Cash/Bank, credit Member Savings
    await postLedgerTransaction(
      {
        tenantId: input.tenantId,
        transactionType: "contribution",
        postedAt: input.postedAt,
        memberId: input.memberId,
        contributionId: contribution.id,
        narration: `Contribution from member${input.periodLabel ? ` for ${input.periodLabel}` : ""}`,
        entries: [
          { ledgerAccountId: cashAccount.id, direction: "debit", amount: input.amount },
          { ledgerAccountId: savingsAccount.id, direction: "credit", amount: input.amount },
        ],
      },
      tx as unknown as PrismaClient,
    )

    // Update member savings snapshot
    await tx.member.update({
      where: { id: input.memberId, tenantId: input.tenantId },
      data: {
        totalSavingsSnapshot: { increment: input.amount },
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "contribution.recorded",
        entityType: "Contribution",
        entityId: contribution.id,
        metadata: {
          memberId: input.memberId,
          amount: input.amount,
          channel: input.channel,
        },
        occurredAt: new Date(),
      },
    })

    return contribution
  })
}

export async function getContributionHistory(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.contribution.findMany({
    where: { tenantId, memberId },
    orderBy: { postedAt: "desc" },
    take: 50,
  })
}

export async function getMemberSavingsTotal(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const result = await prisma.contribution.aggregate({
    where: { tenantId, memberId, status: "posted" },
    _sum: { amount: true },
  })

  return Number(result._sum.amount ?? 0)
}
