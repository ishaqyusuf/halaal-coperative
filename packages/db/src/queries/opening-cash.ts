import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError, isUniqueConstraintError } from "../query-error"
import { ensureTenantLedgerAccounts, postLedgerTransaction } from "./ledger"
import { getTenantMigrationWriteAccess } from "./migration"
import {
  getTenantOpeningCashAmount,
  OPENING_CASH_LEDGER_REFERENCE,
} from "./opening-cash-amount"

export {
  getTenantOpeningCashAmount,
  OPENING_CASH_LEDGER_REFERENCE,
} from "./opening-cash-amount"

/**
 * Cooperative opening cash (triage 1.9): cash the cooperative held when it
 * joined Halaalvest that members' opening savings and share capital don't
 * already account for, such as profit kept in the bank.
 *
 * It lives only in the general ledger: Dr Cash / Bank (2000), Cr Cooperative
 * Equity (4000), reference `opening-cash`. The figure is the net of those
 * postings on 2000. Changing it before go-live posts the difference, so the
 * ledger keeps every change; saving the same figure again posts nothing.
 * After go-live it can't change.
 */

const CASH_ACCOUNT_CODE = "2000"
const EQUITY_ACCOUNT_CODE = "4000"

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  return prisma
}

export type OpeningCashSetting = {
  amount: number
  /** False once the cooperative is live. */
  canChange: boolean
}

export async function getTenantOpeningCashSetting(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<OpeningCashSetting> {
  const prisma = getPrisma(prismaOverride)
  const [amount, writeAccess] = await Promise.all([
    getTenantOpeningCashAmount(tenantId, prisma),
    getTenantMigrationWriteAccess(tenantId, prisma),
  ])

  return { amount, canChange: !writeAccess.canUseLiveFinancialWrites }
}

export type SetTenantOpeningCashResult = {
  amount: number
  changed: boolean
  previousAmount: number
}

/**
 * Records the opening cash figure. Idempotent: the same figure posts
 * nothing. A change posts the difference with a numbered idempotency key, so
 * two identical saves at once post once.
 */
export async function setTenantOpeningCash(
  input: {
    actorUserId: string
    amount: number
    /** Defaults to now; tests pin it. */
    now?: Date
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<SetTenantOpeningCashResult> {
  const prisma = getPrisma(prismaOverride)

  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw ExpectedQueryError.validation("Cash on hand must be ₦0 or more.")
  }

  const amount = roundMoney(input.amount)
  const writeAccess = await getTenantMigrationWriteAccess(
    input.tenantId,
    prisma
  )

  if (writeAccess.canUseLiveFinancialWrites) {
    throw ExpectedQueryError.precondition(
      "Opening cash can't change after the cooperative has gone live."
    )
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const db = tx as unknown as PrismaClient
      const previousAmount = await getTenantOpeningCashAmount(
        input.tenantId,
        db
      )
      const difference = roundMoney(amount - previousAmount)

      if (difference === 0) {
        return { amount, changed: false, previousAmount }
      }

      const [accounts, postingCount] = await Promise.all([
        ensureTenantLedgerAccounts(input.tenantId, db),
        db.ledgerTransaction.count({
          where: {
            reference: OPENING_CASH_LEDGER_REFERENCE,
            tenantId: input.tenantId,
          },
        }),
      ])
      const cashAccountId = accounts[CASH_ACCOUNT_CODE]
      const equityAccountId = accounts[EQUITY_ACCOUNT_CODE]

      if (!cashAccountId || !equityAccountId) {
        throw new Error("Ledger accounts not initialized for this cooperative")
      }

      const value = Math.abs(difference)
      const increase = difference > 0

      await postLedgerTransaction(
        {
          entries: [
            {
              amount: value,
              direction: "debit",
              ledgerAccountId: increase ? cashAccountId : equityAccountId,
            },
            {
              amount: value,
              direction: "credit",
              ledgerAccountId: increase ? equityAccountId : cashAccountId,
            },
          ],
          idempotencyKey: `${OPENING_CASH_LEDGER_REFERENCE}:${postingCount + 1}`,
          narration:
            previousAmount === 0 && increase
              ? "Cash on hand when the cooperative joined Halaalvest"
              : "Change to cash on hand when the cooperative joined Halaalvest",
          postedAt: input.now ?? new Date(),
          reference: OPENING_CASH_LEDGER_REFERENCE,
          sourceType: "backfill",
          tenantId: input.tenantId,
          transactionType: "adjustment",
        },
        db
      )

      await db.auditLog.create({
        data: {
          action: "opening_cash.set",
          actorType: "user",
          actorUserId: input.actorUserId,
          entityId: input.tenantId,
          entityType: "Tenant",
          metadata: { amount, previousAmount },
          occurredAt: new Date(),
          tenantId: input.tenantId,
        },
      })

      return { amount, changed: true, previousAmount }
    })
  } catch (error) {
    // A concurrent save claimed the same posting number. If it recorded the
    // same figure, this save is already done.
    if (isUniqueConstraintError(error)) {
      const recorded = await getTenantOpeningCashAmount(input.tenantId, prisma)

      if (recorded === amount) {
        return { amount, changed: false, previousAmount: amount }
      }

      throw ExpectedQueryError.conflict(
        "Opening cash was changed at the same time. Check the figure and try again."
      )
    }

    throw error
  }
}
