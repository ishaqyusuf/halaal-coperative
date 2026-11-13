import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import {
  openingBalanceLedgerReference,
  postOpeningFinancingLedgerEntry,
  postOpeningShareCapitalLedgerEntry,
} from "./opening-balances"

/**
 * Corrective posting for opening positions applied before QA F3 was fixed.
 * Those applies posted savings only, so opening share capital never reached
 * Member Share Capital (3200) and opening financing never reached Loan
 * Receivable (1100). This posts the missing brought-forward entries with the
 * same references, accounts and dates a fresh apply now uses. It never edits
 * existing rows, and the reference idempotency key makes reruns no-ops.
 */
export type OpeningBalanceLedgerBackfillAction = {
  amount: number
  kind: "financing" | "share_capital"
  memberId: string
  openingBalanceId: string
  reference: string
  tenantId: string
  transactionId: string | null
}

export type OpeningBalanceLedgerBackfillResult = {
  actions: OpeningBalanceLedgerBackfillAction[]
  applied: boolean
  scannedOpeningBalanceCount: number
}

export async function backfillOpeningBalanceLedgerPostings(
  input: {
    actorUserId?: string | null
    apply: boolean
    tenantIds?: string[]
  },
  prismaOverride?: PrismaClient
): Promise<OpeningBalanceLedgerBackfillResult> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const openingBalances = await prisma.memberOpeningBalance.findMany({
    orderBy: [{ tenantId: "asc" }, { appliedAt: "asc" }],
    select: {
      activeFinancingOutstanding: true,
      appliedLoanId: true,
      id: true,
      memberId: true,
      openingDate: true,
      shareCapitalBalance: true,
      tenantId: true,
    },
    where: {
      status: "applied",
      ...(input.tenantIds?.length ? { tenantId: { in: input.tenantIds } } : {}),
    },
  })

  const actions: OpeningBalanceLedgerBackfillAction[] = []

  for (const row of openingBalances) {
    const shareCapital = Number(row.shareCapitalBalance ?? 0)
    const financing = Number(row.activeFinancingOutstanding ?? 0)
    const candidates: Omit<OpeningBalanceLedgerBackfillAction, "transactionId">[] =
      []

    if (shareCapital > 0) {
      candidates.push({
        amount: shareCapital,
        kind: "share_capital",
        memberId: row.memberId,
        openingBalanceId: row.id,
        reference: openingBalanceLedgerReference.shareCapital(row.id),
        tenantId: row.tenantId,
      })
    }

    // Only positions that created a linked opening loan carry a receivable.
    if (financing > 0 && row.appliedLoanId) {
      candidates.push({
        amount: financing,
        kind: "financing",
        memberId: row.memberId,
        openingBalanceId: row.id,
        reference: openingBalanceLedgerReference.financing(row.id),
        tenantId: row.tenantId,
      })
    }

    for (const candidate of candidates) {
      const existing = await prisma.ledgerTransaction.findFirst({
        select: { id: true },
        where: { reference: candidate.reference, tenantId: candidate.tenantId },
      })

      if (existing) continue

      if (!input.apply) {
        actions.push({ ...candidate, transactionId: null })
        continue
      }

      const transaction = await prisma.$transaction(async (tx: any) => {
        const posted =
          candidate.kind === "share_capital"
            ? await postOpeningShareCapitalLedgerEntry(
                {
                  amount: candidate.amount,
                  memberId: candidate.memberId,
                  openingBalanceId: candidate.openingBalanceId,
                  postedAt: row.openingDate,
                  tenantId: candidate.tenantId,
                },
                tx
              )
            : await postOpeningFinancingLedgerEntry(
                {
                  amount: candidate.amount,
                  loanId: row.appliedLoanId,
                  memberId: candidate.memberId,
                  openingBalanceId: candidate.openingBalanceId,
                  postedAt: row.openingDate,
                  tenantId: candidate.tenantId,
                },
                tx
              )

        await createAuditLogEntry(
          {
            action: "migration.opening_balance.ledger_backfilled",
            actorType: input.actorUserId ? "user" : "system",
            actorUserId: input.actorUserId ?? null,
            entityId: candidate.openingBalanceId,
            entityType: "MemberOpeningBalance",
            metadata: {
              amount: candidate.amount,
              kind: candidate.kind,
              ledgerTransactionId: posted.id,
              memberId: candidate.memberId,
              reason:
                "QA F3: opening position applied before share capital and financing posted to the general ledger.",
              reference: candidate.reference,
            },
            tenantId: candidate.tenantId,
          },
          tx
        )

        return posted
      })

      actions.push({ ...candidate, transactionId: transaction.id })
    }
  }

  return {
    actions,
    applied: input.apply,
    scannedOpeningBalanceCount: openingBalances.length,
  }
}
