import type { ChargeKind, PrismaClient } from "@prisma/client"
import { createPrismaClient } from "../prisma"
import { postLedgerTransaction, getLedgerAccountByCode } from "./ledger"

export async function listChargeDefinitions(
  tenantId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.chargeDefinition.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  })
}

export async function listChargeApplications(
  tenantId: string,
  input?: {
    fromDate?: Date
    limit?: number
    memberId?: string
    search?: string
    status?: string
    toDate?: Date
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.chargeApplication.findMany({
    where: {
      tenantId,
      ...(input?.memberId ? { memberId: input.memberId } : {}),
      ...(input?.status ? { status: input.status as never } : {}),
      ...((input?.fromDate || input?.toDate)
        ? {
            assessedAt: {
              ...(input?.fromDate ? { gte: input.fromDate } : {}),
              ...(input?.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
      ...(input?.search
        ? {
            OR: [
              { notes: { contains: input.search, mode: "insensitive" } },
              {
                member: {
                  fullName: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
              {
                member: {
                  memberNumber: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
              {
                chargeDefinition: {
                  name: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      chargeDefinition: true,
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
        },
      },
    },
    orderBy: { assessedAt: "desc" },
    take: input?.limit ?? 100,
  })
}

export type CreateChargeDefinitionInput = {
  tenantId: string
  name: string
  code: string
  kind: ChargeKind
  amount: number
  isMonthlyLevy?: boolean
  appliesToMembers?: boolean
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
}

export async function createChargeDefinition(
  input: CreateChargeDefinitionInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.chargeDefinition.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      code: input.code,
      kind: input.kind,
      amount: input.amount,
      isMonthlyLevy: input.isMonthlyLevy ?? false,
      appliesToMembers: input.appliesToMembers ?? true,
      appliesToLoanRequests: input.appliesToLoanRequests ?? false,
      appliesToLoans: input.appliesToLoans ?? false,
      isActive: true,
    },
  })
}

export type UpdateChargeDefinitionInput = {
  name?: string
  amount?: number
  isActive?: boolean
  appliesToMembers?: boolean
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
}

export async function updateChargeDefinition(
  tenantId: string,
  chargeDefinitionId: string,
  input: UpdateChargeDefinitionInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.chargeDefinition.update({
    where: { id: chargeDefinitionId, tenantId },
    data: input,
  })
}

export type ApplyChargeInput = {
  tenantId: string
  memberId: string
  chargeDefinitionId: string
  amount: number
  assessedAt: Date
  contributionId?: string
  loanRequestId?: string
  loanId?: string
  notes?: string
  actorUserId: string
}

export async function applyCharge(
  input: ApplyChargeInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const chargeDef = await prisma.chargeDefinition.findFirst({
    where: { id: input.chargeDefinitionId, tenantId: input.tenantId },
  })
  if (!chargeDef) throw new Error("Charge definition not found")

  const ledgerAccountCode = chargeDef.isMonthlyLevy ? "3100" : "3000"
  const savingsAccount = await getLedgerAccountByCode(input.tenantId, "1000", prisma)
  const incomeAccount = await getLedgerAccountByCode(input.tenantId, ledgerAccountCode, prisma)

  if (!savingsAccount || !incomeAccount) {
    throw new Error("Ledger accounts not initialized for this tenant")
  }

  return prisma.$transaction(async (tx) => {
    const application = await tx.chargeApplication.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        chargeDefinitionId: input.chargeDefinitionId,
        amount: input.amount,
        assessedAt: input.assessedAt,
        status: "posted",
        contributionId: input.contributionId,
        loanRequestId: input.loanRequestId,
        loanId: input.loanId,
        notes: input.notes,
      },
    })

    // Post ledger: debit Member Savings, credit Charge/Levy Income
    await postLedgerTransaction(
      {
        tenantId: input.tenantId,
        transactionType: chargeDef.isMonthlyLevy ? "levy" : "charge",
        postedAt: input.assessedAt,
        memberId: input.memberId,
        chargeApplicationId: application.id,
        narration: `${chargeDef.name} assessed`,
        entries: [
          { ledgerAccountId: savingsAccount.id, direction: "debit", amount: input.amount },
          { ledgerAccountId: incomeAccount.id, direction: "credit", amount: input.amount },
        ],
      },
      tx as unknown as PrismaClient,
    )

    await tx.member.update({
      where: { id: input.memberId, tenantId: input.tenantId },
      data: {
        totalSavingsSnapshot: {
          decrement: input.amount,
        },
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "charge.applied",
        entityType: "ChargeApplication",
        entityId: application.id,
        metadata: {
          memberId: input.memberId,
          chargeDefinitionId: input.chargeDefinitionId,
          amount: input.amount,
        },
        occurredAt: new Date(),
      },
    })

    return application
  })
}

async function restoreChargeToMemberSavings(input: {
  isMonthlyLevy: boolean
  amount: number
  applicationId: string
  applicationName: string
  assessedAt: Date
  memberId: string
  tenantId: string
  tx: PrismaClient
}) {
  const savingsAccount = await getLedgerAccountByCode(input.tenantId, "1000", input.tx)
  const incomeAccount = await getLedgerAccountByCode(
    input.tenantId,
    input.isMonthlyLevy ? "3100" : "3000",
    input.tx,
  )

  if (!savingsAccount || !incomeAccount) {
    throw new Error("Ledger accounts not initialized for this tenant")
  }

  await postLedgerTransaction(
    {
      tenantId: input.tenantId,
      transactionType: "charge",
      postedAt: input.assessedAt,
      memberId: input.memberId,
      chargeApplicationId: input.applicationId,
      narration: `${input.applicationName} restored`,
      entries: [
        { ledgerAccountId: incomeAccount.id, direction: "debit", amount: input.amount },
        { ledgerAccountId: savingsAccount.id, direction: "credit", amount: input.amount },
      ],
    },
    input.tx,
  )

  await input.tx.member.update({
    where: { id: input.memberId, tenantId: input.tenantId },
    data: {
      totalSavingsSnapshot: {
        increment: input.amount,
      },
    },
  })
}

export async function waiveChargeApplication(
  input: {
    actorUserId: string
    chargeApplicationId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    const application = await tx.chargeApplication.findFirst({
      where: { id: input.chargeApplicationId, tenantId: input.tenantId },
      include: { chargeDefinition: true },
    })

    if (!application) throw new Error("Charge application not found")
    if (application.status !== "posted") throw new Error("Only posted charge applications can be waived.")

    const updated = await tx.chargeApplication.update({
      where: { id: application.id },
      data: {
        status: "waived",
        waivedAt: new Date(),
      },
    })

    await restoreChargeToMemberSavings({
      isMonthlyLevy: application.chargeDefinition.isMonthlyLevy,
      amount: Number(application.amount),
      applicationId: application.id,
      applicationName: application.chargeDefinition.name,
      assessedAt: new Date(),
      memberId: application.memberId,
      tenantId: input.tenantId,
      tx: tx as unknown as PrismaClient,
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "charge.waived",
        entityType: "ChargeApplication",
        entityId: updated.id,
        metadata: {
          amount: Number(updated.amount),
        },
        occurredAt: new Date(),
      },
    })

    return updated
  })
}

export async function reverseChargeApplication(
  input: {
    actorUserId: string
    chargeApplicationId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    const application = await tx.chargeApplication.findFirst({
      where: { id: input.chargeApplicationId, tenantId: input.tenantId },
      include: { chargeDefinition: true },
    })

    if (!application) throw new Error("Charge application not found")
    if (application.status !== "posted") throw new Error("Only posted charge applications can be reversed.")

    const updated = await tx.chargeApplication.update({
      where: { id: application.id },
      data: {
        status: "reversed",
      },
    })

    await restoreChargeToMemberSavings({
      isMonthlyLevy: application.chargeDefinition.isMonthlyLevy,
      amount: Number(application.amount),
      applicationId: application.id,
      applicationName: application.chargeDefinition.name,
      assessedAt: new Date(),
      memberId: application.memberId,
      tenantId: input.tenantId,
      tx: tx as unknown as PrismaClient,
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "charge.reversed",
        entityType: "ChargeApplication",
        entityId: updated.id,
        metadata: {
          amount: Number(updated.amount),
        },
        occurredAt: new Date(),
      },
    })

    return updated
  })
}
