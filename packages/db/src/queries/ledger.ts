import { createPrismaClient } from "../prisma.js"
import type { PrismaClient } from "../generated/prisma/client.js"
import type { EntryDirection, LedgerAccountType, LedgerTransactionType } from "../generated/prisma/client.js"

export type LedgerAccountSeed = {
  code: string
  name: string
  accountType: LedgerAccountType
  isSystem: boolean
}

const STANDARD_CHART_OF_ACCOUNTS: LedgerAccountSeed[] = [
  { code: "1000", name: "Member Savings", accountType: "liability", isSystem: true },
  { code: "1100", name: "Loan Receivable", accountType: "asset", isSystem: true },
  { code: "2000", name: "Cash / Bank", accountType: "asset", isSystem: true },
  { code: "3000", name: "Charge Income", accountType: "income", isSystem: true },
  { code: "3100", name: "Levy Income", accountType: "income", isSystem: true },
  { code: "4000", name: "Cooperative Equity", accountType: "equity", isSystem: true },
]

export async function ensureTenantLedgerAccounts(
  tenantId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const accounts: Record<string, string> = {}

  for (const account of STANDARD_CHART_OF_ACCOUNTS) {
    const result = await prisma.ledgerAccount.upsert({
      where: { tenantId_code: { tenantId, code: account.code } },
      update: {},
      create: { tenantId, ...account },
    })
    accounts[account.code] = result.id
  }

  return accounts
}

export async function getLedgerAccountByCode(
  tenantId: string,
  code: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.ledgerAccount.findUnique({
    where: { tenantId_code: { tenantId, code } },
  })
}

export async function getLedgerAccountsByTenant(
  tenantId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.ledgerAccount.findMany({
    where: { tenantId },
    orderBy: { code: "asc" },
  })
}

export type PostLedgerTransactionEntry = {
  ledgerAccountId: string
  direction: EntryDirection
  amount: number
}

export type PostLedgerTransactionInput = {
  tenantId: string
  transactionType: LedgerTransactionType
  postedAt: Date
  entries: PostLedgerTransactionEntry[]
  memberId?: string
  loanId?: string
  contributionId?: string
  chargeApplicationId?: string
  repaymentId?: string
  reference?: string
  narration?: string
}

export async function postLedgerTransaction(
  input: PostLedgerTransactionInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  if (input.entries.length < 2) {
    throw new Error("A ledger transaction requires at least two entries")
  }

  const debitTotal = input.entries
    .filter((e) => e.direction === "debit")
    .reduce((sum, e) => sum + e.amount, 0)

  const creditTotal = input.entries
    .filter((e) => e.direction === "credit")
    .reduce((sum, e) => sum + e.amount, 0)

  const tolerance = 0.005
  if (Math.abs(debitTotal - creditTotal) > tolerance) {
    throw new Error(
      `Unbalanced ledger transaction: debits=${debitTotal}, credits=${creditTotal}`,
    )
  }

  return prisma.ledgerTransaction.create({
    data: {
      tenantId: input.tenantId,
      transactionType: input.transactionType,
      postedAt: input.postedAt,
      memberId: input.memberId,
      loanId: input.loanId,
      contributionId: input.contributionId,
      chargeApplicationId: input.chargeApplicationId,
      repaymentId: input.repaymentId,
      reference: input.reference,
      narration: input.narration,
      entries: {
        create: input.entries.map((entry) => ({
          tenantId: input.tenantId,
          ledgerAccountId: entry.ledgerAccountId,
          direction: entry.direction,
          amount: entry.amount,
        })),
      },
    },
    include: { entries: true },
  })
}

export async function getAccountBalance(
  tenantId: string,
  ledgerAccountId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const entries = await prisma.ledgerEntry.findMany({
    where: { tenantId, ledgerAccountId },
    select: { direction: true, amount: true },
  })

  let balance = 0
  for (const entry of entries) {
    const amount = Number(entry.amount)
    if (entry.direction === "debit") {
      balance += amount
    } else {
      balance -= amount
    }
  }

  return balance
}

export async function getMemberTransactions(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.ledgerTransaction.findMany({
    where: { tenantId, memberId },
    include: {
      entries: {
        include: { ledgerAccount: true },
      },
    },
    orderBy: { postedAt: "desc" },
  })
}
