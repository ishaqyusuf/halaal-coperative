import { createPrismaClient } from "../prisma.js"
import { postLedgerTransaction, getLedgerAccountByCode } from "./ledger.js"
import type { PrismaClient } from "../generated/prisma/client.js"
import type { ChargeKind } from "../generated/prisma/client.js"

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
