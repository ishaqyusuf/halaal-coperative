import {
  buildMemberPurchaseRelease,
  earnedMarkupForRepayment,
  memberPurchaseAccountCodes,
  memberPurchasePostingKeys,
  memberPurchaseReleaseLines,
  memberPurchaseRepaymentLines,
  type LedgerLine,
  type MemberPurchaseSource,
} from "@halaalvest/domain"

import type { PrismaClient } from "../../generated/prisma/client"
import { QueryInfrastructureError } from "../query-error"
import { createAuditLogEntry } from "./audit"
import { postLedgerTransaction } from "./ledger"
import {
  ensureWritableBusinessProfitSeason,
  getCurrentBusinessProfitSeason,
} from "./tenant-finance"

/**
 * General-ledger postings for goods the cooperative buys on a member's behalf
 * (Procurement and Foodstuff Purchase). See
 * `.brain/decisions/ADR-20261116-member-purchase-receivable.md`.
 *
 * Release:   Dr 1200 receivable (cost + markup) / Cr 2000 cash (cost)
 *            / Cr 2200 unearned profit (markup)
 * Repayment: Dr 2000 cash / Cr 1200 receivable, and
 *            Dr 2200 / Cr 3300 for the share of markup it earns.
 *
 * Every posting carries a tenant-unique idempotency key, so a release posts
 * once per request or application and a repayment once per receipt
 * allocation. Callers run inside their own (serializable) transaction.
 */

const OPENING_EQUITY = "4000"

/** Accounts this flow adds to the standard chart; created on first use. */
export const memberPurchaseLedgerAccounts = [
  {
    accountType: "asset" as const,
    code: memberPurchaseAccountCodes.receivable,
    isSystem: true,
    name: "Member Purchase Receivable",
  },
  {
    accountType: "liability" as const,
    code: memberPurchaseAccountCodes.unearnedProfit,
    isSystem: true,
    name: "Unearned Purchase Profit",
  },
  {
    accountType: "income" as const,
    code: memberPurchaseAccountCodes.earnedProfit,
    isSystem: true,
    name: "Purchase Profit",
  },
]

const neededCodes = [
  ...memberPurchaseLedgerAccounts.map((account) => account.code),
  memberPurchaseAccountCodes.cash,
  OPENING_EQUITY,
]

async function ensureMemberPurchaseAccounts(
  tenantId: string,
  tx: PrismaClient
) {
  let accounts = await tx.ledgerAccount.findMany({
    select: { code: true, id: true },
    where: { code: { in: neededCodes }, tenantId },
  })

  if (accounts.length < neededCodes.length) {
    // Cooperatives created before this flow get the three accounts lazily.
    await tx.ledgerAccount.createMany({
      data: memberPurchaseLedgerAccounts.map((account) => ({
        ...account,
        tenantId,
      })),
      skipDuplicates: true,
    })
    accounts = await tx.ledgerAccount.findMany({
      select: { code: true, id: true },
      where: { code: { in: neededCodes }, tenantId },
    })
  }

  const byCode = new Map(accounts.map((account) => [account.code, account.id]))
  const missing = neededCodes.filter((code) => !byCode.has(code))
  if (missing.length) {
    throw new QueryInfrastructureError(
      `Ledger accounts not initialized for this cooperative: ${missing.join(", ")}`
    )
  }
  return byCode
}

function toEntries(lines: LedgerLine[], byCode: Map<string, string>) {
  return lines.map((line) => ({
    amount: line.amount,
    direction: line.direction,
    ledgerAccountId: byCode.get(line.accountCode)!,
  }))
}

type ReleasePosting = {
  cost: number
  markup: number
  receivable: number
  transactionId: string
}

async function findPosting(tenantId: string, key: string, tx: PrismaClient) {
  return tx.ledgerTransaction.findUnique({
    include: { entries: { include: { ledgerAccount: true } } },
    where: { tenantId_idempotencyKey: { idempotencyKey: key, tenantId } },
  })
}

function readRelease(
  posting: NonNullable<Awaited<ReturnType<typeof findPosting>>>
): ReleasePosting {
  const total = (code: string, direction: "credit" | "debit") =>
    posting.entries
      .filter(
        (entry) =>
          entry.ledgerAccount.code === code && entry.direction === direction
      )
      .reduce((sum, entry) => sum + Number(entry.amount), 0)
  const receivable = total(memberPurchaseAccountCodes.receivable, "debit")
  const markup = total(memberPurchaseAccountCodes.unearnedProfit, "credit")

  return {
    cost: Math.round((receivable - markup) * 100) / 100,
    markup,
    receivable,
    transactionId: posting.id,
  }
}

export type MemberPurchaseReleaseInput = {
  /** What the cooperative paid. */
  cost: number
  itemLabel: string
  /** The cooperative's added profit. */
  markup: number
  memberId: string
  /**
   * `opening`: a brought-forward obligation carried in from before the
   * cooperative used Halaalvest; the counterpart is opening equity (4000),
   * not cash, as for opening financing.
   */
  origin: "live" | "opening"
  /**
   * Already repaid on this obligation without reaching the ledger: payments
   * made before the receivable existed. A newly posted release posts them
   * once too, so 1200 and cash match what is really owed and held.
   */
  priorPaid?: number
  reference?: string | null
  releasedAt: Date
  releasedByUserId: string | null
  source: MemberPurchaseSource
  sourceId: string
  tenantId: string
}

/**
 * Posts the release of goods to a member once. A second call (retry, double
 * click, a later repayment catching up) returns the first posting unchanged.
 */
export async function postMemberPurchaseRelease(
  input: MemberPurchaseReleaseInput,
  tx: PrismaClient
): Promise<ReleasePosting & { created: boolean }> {
  const key = memberPurchasePostingKeys.release(input.source, input.sourceId)
  const existing = await findPosting(input.tenantId, key, tx)
  if (existing) return { ...readRelease(existing), created: false }

  const release = buildMemberPurchaseRelease({
    cost: input.cost,
    markup: input.markup,
  })
  const byCode = await ensureMemberPurchaseAccounts(input.tenantId, tx)
  const lines = memberPurchaseReleaseLines(release).map((line) =>
    input.origin === "opening" &&
    line.accountCode === memberPurchaseAccountCodes.cash
      ? { ...line, accountCode: OPENING_EQUITY }
      : line
  )

  const posting = await postLedgerTransaction(
    {
      entries: toEntries(lines, byCode),
      idempotencyKey: key,
      memberId: input.memberId,
      // Callers have already checked live financial writes for this action.
      migrationWriteGuardValidated: true,
      narration:
        input.origin === "opening"
          ? `Brought-forward goods owed: ${input.itemLabel}`
          : `Goods bought for you: ${input.itemLabel}`,
      postedAt: input.releasedAt,
      reference: input.reference ?? undefined,
      tenantId: input.tenantId,
      transactionType: "member_purchase_release",
    },
    tx
  )

  await createAuditLogEntry(
    {
      action: "member_purchase.released",
      actorType: input.releasedByUserId ? "user" : "system",
      actorUserId: input.releasedByUserId ?? undefined,
      entityId: input.sourceId,
      entityType:
        input.source === "procurement"
          ? "ProcurementRequest"
          : "FoodPurchaseApplication",
      metadata: {
        cost: release.cost,
        ledgerTransactionId: posting.id,
        markup: release.markup,
        memberId: input.memberId,
        origin: input.origin,
        receivable: release.receivable,
        releasedAt: input.releasedAt.toISOString(),
        releasedByUserId: input.releasedByUserId,
        source: input.source,
      },
      tenantId: input.tenantId,
    },
    tx
  )

  const priorPaid = Math.round((input.priorPaid ?? 0) * 100) / 100
  if (priorPaid > 0) {
    const earnedMarkup = earnedMarkupForRepayment({
      amount: Math.min(priorPaid, release.receivable),
      markup: release.markup,
      paidBefore: 0,
      receivable: release.receivable,
    })
    await postLedgerTransaction(
      {
        entries: toEntries(
          memberPurchaseRepaymentLines({
            amount: Math.min(priorPaid, release.receivable),
            earnedMarkup,
          }),
          byCode
        ),
        idempotencyKey: memberPurchasePostingKeys.priorRepayments(
          input.source,
          input.sourceId
        ),
        memberId: input.memberId,
        migrationWriteGuardValidated: true,
        narration: `Repaid before: ${input.itemLabel}`,
        postedAt: input.releasedAt,
        tenantId: input.tenantId,
        transactionType: "member_purchase_repayment",
      },
      tx
    )
    if (earnedMarkup > 0) {
      await syncMemberPurchaseProfitIntoSeason(
        { asOf: new Date(), tenantId: input.tenantId },
        tx
      )
    }
  }

  return { ...release, created: true, transactionId: posting.id }
}

export type MemberPurchaseRepaymentInput = {
  actorUserId: string
  /** Receipt allocation being posted; the posting key. */
  allocationId: string
  amount: number
  memberId: string
  paidAt: Date
  /** Repaid on this obligation before this allocation. */
  paidBefore: number
  reference?: string | null
  /** Used only when the obligation was released before this flow existed. */
  releaseIfMissing: MemberPurchaseReleaseInput
  source: MemberPurchaseSource
  sourceId: string
  tenantId: string
}

/**
 * Posts one repayment allocation: cash in, receivable down, and the matching
 * share of markup moved from unearned to earned. The markup and the amount
 * owed are read from the posted release, never from editable request fields.
 */
export async function postMemberPurchaseRepayment(
  input: MemberPurchaseRepaymentInput,
  tx: PrismaClient
) {
  const key = memberPurchasePostingKeys.repayment(input.allocationId)
  const existing = await findPosting(input.tenantId, key, tx)
  if (existing)
    return { created: false, earnedMarkup: 0, transactionId: existing.id }

  const release = await postMemberPurchaseRelease(input.releaseIfMissing, tx)
  const earnedMarkup = earnedMarkupForRepayment({
    amount: input.amount,
    markup: release.markup,
    paidBefore: input.paidBefore,
    receivable: release.receivable,
  })
  const byCode = await ensureMemberPurchaseAccounts(input.tenantId, tx)

  const posting = await postLedgerTransaction(
    {
      entries: toEntries(
        memberPurchaseRepaymentLines({ amount: input.amount, earnedMarkup }),
        byCode
      ),
      idempotencyKey: key,
      memberId: input.memberId,
      migrationWriteGuardValidated: true,
      narration: `Repayment for ${input.releaseIfMissing.itemLabel}`,
      postedAt: input.paidAt,
      reference: input.reference ?? undefined,
      tenantId: input.tenantId,
      transactionType: "member_purchase_repayment",
    },
    tx
  )

  return { created: true, earnedMarkup, transactionId: posting.id }
}

/** Marks the one business Halaalvest keeps itself for purchase profit. */
export const memberPurchaseSalesBusinessKey = "member_purchase_sales"

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * Carries earned purchase profit (3300) into the profit books, where season
 * profit is shared today (ADR-016). One business per cooperative,
 * "Procurement and foodstuff sales", created automatically the first time
 * markup is earned, keeps one draft profit entry in the current writable
 * season and tops it up to everything 3300 has earned that no entry holds
 * yet. If the season is not writable (shared, closed or overlapping), the
 * profit waits in 3300 and the next top-up in a writable season brings it
 * in. A repayment never fails because of the season.
 */
export async function syncMemberPurchaseProfitIntoSeason(
  input: { asOf: Date; tenantId: string },
  tx: PrismaClient
) {
  const { tenantId } = input
  const earnedAccount = await tx.ledgerAccount.findUnique({
    select: { id: true },
    where: {
      tenantId_code: {
        code: memberPurchaseAccountCodes.earnedProfit,
        tenantId,
      },
    },
  })
  if (!earnedAccount) return { toppedUp: 0 }

  const sums = await tx.ledgerEntry.groupBy({
    _sum: { amount: true },
    by: ["direction"],
    where: { ledgerAccountId: earnedAccount.id, tenantId },
  })
  const credit = Number(
    sums.find((row) => row.direction === "credit")?._sum.amount ?? 0
  )
  const debit = Number(
    sums.find((row) => row.direction === "debit")?._sum.amount ?? 0
  )
  const earned = roundMoney(credit - debit)
  if (earned <= 0) return { toppedUp: 0 }

  let business = await tx.shareBusiness.findFirst({
    select: { id: true },
    where: { systemKey: memberPurchaseSalesBusinessKey, tenantId },
  })
  const transferred = business
    ? Number(
        (
          await tx.shareBusinessProfitEntry.aggregate({
            _sum: { profitAmount: true },
            where: {
              shareBusinessId: business.id,
              status: { not: "archived" },
              tenantId,
            },
          })
        )._sum.profitAmount ?? 0
      )
    : 0
  const topUp = roundMoney(earned - transferred)
  if (topUp <= 0) return { toppedUp: 0 }

  const today = startOfUtcDay(input.asOf)
  const season = await getCurrentBusinessProfitSeason(tenantId, tx, today)
  if (!season.canRecordProfit) return { toppedUp: 0, waiting: topUp }
  const period = await ensureWritableBusinessProfitSeason(
    { profitDate: today, referenceDate: today, tenantId },
    tx
  )

  if (!business) {
    business = await tx.shareBusiness.create({
      data: {
        capitalAmount: 0,
        name: "Procurement and foodstuff sales",
        notes:
          "Added automatically by Halaalvest. It holds the profit the cooperative earns as members pay back procurement and foodstuff.",
        profitAmount: 0,
        startDate: today,
        status: "active",
        systemKey: memberPurchaseSalesBusinessKey,
        tenantId,
      },
      select: { id: true },
    })
  }

  const entry = await tx.shareBusinessProfitEntry.findFirst({
    select: { id: true },
    where: {
      linkedDividendPeriodId: period.id,
      shareBusinessId: business.id,
      status: "draft",
      tenantId,
    },
  })

  if (entry) {
    await tx.shareBusinessProfitEntry.update({
      data: {
        allocatableProfitAmount: { increment: topUp },
        profitAmount: { increment: topUp },
        profitDate: today,
      },
      where: { id: entry.id },
    })
  } else {
    await tx.shareBusinessProfitEntry.create({
      data: {
        allocatableProfitAmount: topUp,
        expenseAmount: 0,
        linkedDividendPeriodId: period.id,
        profitAmount: topUp,
        profitDate: today,
        reason: "Profit earned as members paid back procurement and foodstuff",
        shareBusinessId: business.id,
        sourceType: "manual",
        status: "draft",
        tenantId,
      },
    })
  }

  await tx.shareBusiness.update({
    data: { profitAmount: { increment: topUp } },
    where: { id: business.id },
  })

  return { toppedUp: topUp }
}

function monthLabel(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(value)
}

/**
 * Release figures for a procurement request, read from the request and its
 * schedule. The schedule is what the member owes, so cost = schedule total −
 * markup. Brought-forward requests carry their outstanding as cost with no
 * markup, against opening equity.
 */
export async function procurementReleaseInput(
  input: { procurementRequestId: string; tenantId: string },
  tx: PrismaClient
): Promise<MemberPurchaseReleaseInput> {
  const request = await tx.procurementRequest.findFirst({
    select: {
      approvedMarkup: true,
      id: true,
      itemName: true,
      memberId: true,
      openingBalanceSource: { select: { id: true } },
      purchaseReference: true,
      purchasedAt: true,
      purchasedByUserId: true,
      requestedAt: true,
      repaymentScheduleItems: { select: { amount: true, paidAmount: true } },
    },
    where: { id: input.procurementRequestId, tenantId: input.tenantId },
  })
  if (!request) {
    throw new QueryInfrastructureError("Procurement request was not found.")
  }
  const owed = roundMoney(
    request.repaymentScheduleItems.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    )
  )
  const opening = Boolean(request.openingBalanceSource)
  const markup = opening ? 0 : Number(request.approvedMarkup ?? 0)
  const paid = roundMoney(
    request.repaymentScheduleItems.reduce(
      (sum, item) => sum + Number(item.paidAmount),
      0
    )
  )

  return {
    cost: roundMoney(owed - markup),
    itemLabel: request.itemName,
    priorPaid: paid,
    markup,
    memberId: request.memberId,
    origin: opening ? "opening" : "live",
    reference: request.purchaseReference,
    releasedAt: request.purchasedAt ?? request.requestedAt,
    releasedByUserId: request.purchasedByUserId,
    source: "procurement",
    sourceId: request.id,
    tenantId: input.tenantId,
  }
}

/**
 * Release figures for a foodstuff request. The approved amount is the price
 * the member pays; the added profit is the part of it that is markup.
 */
export async function foodPurchaseReleaseInput(
  input: {
    applicationId: string
    /** Used when the goods have no release date yet (released now). */
    releasedAt: Date
    releasedByUserId: string | null
    tenantId: string
  },
  tx: PrismaClient
): Promise<MemberPurchaseReleaseInput> {
  const application = await tx.foodPurchaseApplication.findFirst({
    select: {
      approvedAmount: true,
      approvedMarkup: true,
      cycle: { select: { periodMonth: true } },
      goodsReleasedAt: true,
      goodsReleasedByUserId: true,
      id: true,
      itemDescription: true,
      memberId: true,
      openingBalanceSource: { select: { id: true } },
      paidAmount: true,
    },
    where: { id: input.applicationId, tenantId: input.tenantId },
  })
  if (!application) {
    throw new QueryInfrastructureError(
      "Foodstuff Purchase application was not found."
    )
  }
  const opening = Boolean(application.openingBalanceSource)
  const owed = Number(application.approvedAmount ?? 0)
  const markup = opening ? 0 : Number(application.approvedMarkup ?? 0)

  return {
    cost: roundMoney(owed - markup),
    itemLabel:
      application.itemDescription?.trim() ||
      `Foodstuff for ${monthLabel(application.cycle.periodMonth)}`,
    markup,
    priorPaid: Number(application.paidAmount ?? 0),
    memberId: application.memberId,
    origin: opening ? "opening" : "live",
    releasedAt: application.goodsReleasedAt ?? input.releasedAt,
    releasedByUserId: application.goodsReleasedAt
      ? application.goodsReleasedByUserId
      : input.releasedByUserId,
    source: "food_purchase",
    sourceId: application.id,
    tenantId: input.tenantId,
  }
}

/**
 * Releases a foodstuff request's goods once: posts the release and stamps
 * who released them and when on the request, for finance review.
 */
export async function releaseFoodPurchaseGoods(
  input: {
    applicationId: string
    releasedAt: Date
    releasedByUserId: string | null
    tenantId: string
  },
  tx: PrismaClient
) {
  const release = await postMemberPurchaseRelease(
    await foodPurchaseReleaseInput(input, tx),
    tx
  )
  await tx.foodPurchaseApplication.updateMany({
    data: {
      goodsReleasedAt: input.releasedAt,
      goodsReleasedByUserId: input.releasedByUserId,
    },
    where: {
      goodsReleasedAt: null,
      id: input.applicationId,
      tenantId: input.tenantId,
    },
  })
  return release
}
