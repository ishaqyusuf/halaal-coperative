import { randomUUID } from "node:crypto"
import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError, isUniqueConstraintError } from "../query-error"
import { getTenantMigrationWriteAccess } from "./migration"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"

/**
 * Profit payout (triage 1.1, ADR-20261116-profit-payable-then-payout).
 *
 * Sharing a season records what each member is owed: one posting per member
 * per season, Dr Cooperative Equity (4000) / Cr Profit Owed To Members
 * (2300). Paying out clears it: Dr 2300 / Cr Member Savings (1000) with a
 * savings credit, or Cr Cash / Bank (2000) for cash and bank transfers.
 * `ProfitPayout` is unique per (season, member), so a double tap, retry or
 * second tab can never pay the same member twice. A reversal restores the
 * payable; paying again reuses the row and bumps `payCount`.
 */

export type ProfitPayoutDestination = "bank_transfer" | "cash" | "savings"

export const profitPayoutDestinations: ProfitPayoutDestination[] = [
  "savings",
  "cash",
  "bank_transfer",
]

export const BUSINESS_PROFIT_ACCOUNT = {
  accountType: "income" as const,
  code: "3400",
  isSystem: true,
  name: "Business Profit",
}

export const PROFIT_OWED_ACCOUNT = {
  accountType: "liability" as const,
  code: "2300",
  isSystem: true,
  name: "Profit Owed To Members",
}

const destinationWords: Record<ProfitPayoutDestination, string> = {
  bank_transfer: "bank transfer",
  cash: "cash",
  savings: "savings",
}

function money(value: unknown) {
  return Math.round(Number(value ?? 0) * 100) / 100
}

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  return prisma
}

export function profitOwedIdempotencyKey(seasonId: string, memberId: string) {
  return `profit-owed:${seasonId}:${memberId}`
}

export function businessProfitIdempotencyKey(profitEntryId: string) {
  return `business-profit:${profitEntryId}`
}

export function profitPayoutIdempotencyKey(payoutId: string, payCount: number) {
  return `profit-payout:${payoutId}:${payCount}`
}

export function profitPayoutReversalIdempotencyKey(
  payoutId: string,
  payCount: number
) {
  return `profit-payout-reversal:${payoutId}:${payCount}`
}

async function assertLivePayoutsOpen(prisma: PrismaClient, tenantId: string) {
  const access = await getTenantMigrationWriteAccess(tenantId, prisma)

  if (!access.canUseLiveFinancialWrites) {
    throw ExpectedQueryError.precondition(
      "Profit can be paid out once the cooperative is fully set up."
    )
  }
}

/** The accounts payout postings use; 2300 is created for older cooperatives. */
async function getPayoutAccounts(tx: any, tenantId: string) {
  await tx.ledgerAccount.createMany({
    data: [{ ...PROFIT_OWED_ACCOUNT, tenantId }],
    skipDuplicates: true,
  })
  const rows: Array<{ code: string; id: string }> =
    await tx.ledgerAccount.findMany({
      select: { code: true, id: true },
      where: { code: { in: ["1000", "2000", "2300", "4000"] }, tenantId },
    })
  const byCode = new Map(rows.map((row) => [row.code, row.id]))
  const savings = byCode.get("1000")
  const cash = byCode.get("2000")
  const owed = byCode.get("2300")
  const equity = byCode.get("4000")

  if (!savings || !cash || !owed || !equity) {
    throw ExpectedQueryError.precondition(
      "The cooperative's books are not set up yet. Finish setup first."
    )
  }

  return { cash, equity, owed, savings }
}

type RecognisableEntry = {
  allocatableProfitAmount: unknown
  id: string
  profitDate: Date
  shareBusiness: { name: string }
}

/**
 * Bring a closed season's business profit into the books: one posting per
 * profit entry, Dr Cash / Bank (2000) / Cr Business Profit (3400) for the
 * amount to share, dated at the profit date (ADR-016's accounting boundary).
 * Only live (`manual`) entries of ordinary businesses, dated on or after
 * go-live: Halaalvest's own "Procurement and foodstuff sales" business
 * (`systemKey` set) already earned its profit in Purchase Profit (3300),
 * brought-in history was settled outside Halaalvest, and profit dated before
 * go-live is in the opening cash. No other flow puts business cash in 2000
 * (business capital is not posted; receipts have no business category).
 * Keyed per entry, so calling it again posts nothing.
 * Runs inside the caller's transaction.
 */
export async function recognizeSeasonBusinessProfit(
  input: { actorUserId?: string | null; seasonId: string; tenantId: string },
  tx: any
) {
  const entries: RecognisableEntry[] =
    await tx.shareBusinessProfitEntry.findMany({
      select: {
        allocatableProfitAmount: true,
        id: true,
        profitDate: true,
        shareBusiness: { select: { name: true } },
      },
      where: {
        linkedDividendPeriodId: input.seasonId,
        shareBusiness: { systemKey: null },
        sourceType: "manual",
        status: { notIn: ["archived", "draft", "pending"] },
        tenantId: input.tenantId,
      },
    })
  const withProfit = entries.filter(
    (entry) => money(entry.allocatableProfitAmount) > 0
  )
  if (withProfit.length === 0) return { created: 0, total: 0 }

  // Profit dated before go-live was already in the bank then: it is in the
  // opening cash figure (Dr 2000 / Cr 4000, triage 1.9), so posting it again
  // would count that cash twice. Sharing it still draws on 4000.
  const tenant: { migrationFinalizedAt: Date | null } | null =
    await tx.tenant.findUnique({
      select: { migrationFinalizedAt: true },
      where: { id: input.tenantId },
    })
  const goLiveDay = tenant?.migrationFinalizedAt
    ? Date.UTC(
        tenant.migrationFinalizedAt.getUTCFullYear(),
        tenant.migrationFinalizedAt.getUTCMonth(),
        tenant.migrationFinalizedAt.getUTCDate()
      )
    : null
  const toPost = withProfit.filter(
    (entry) => goLiveDay === null || entry.profitDate.getTime() >= goLiveDay
  )
  if (toPost.length === 0) return { created: 0, total: 0 }

  const existing: Array<{ idempotencyKey: string | null }> =
    await tx.ledgerTransaction.findMany({
      select: { idempotencyKey: true },
      where: {
        idempotencyKey: {
          in: toPost.map((entry) => businessProfitIdempotencyKey(entry.id)),
        },
        tenantId: input.tenantId,
      },
    })
  const done = new Set(existing.map((row) => row.idempotencyKey))
  const missing = toPost.filter(
    (entry) => !done.has(businessProfitIdempotencyKey(entry.id))
  )
  if (missing.length === 0) return { created: 0, total: 0 }

  await tx.ledgerAccount.createMany({
    data: [{ ...BUSINESS_PROFIT_ACCOUNT, tenantId: input.tenantId }],
    skipDuplicates: true,
  })
  const rows: Array<{ code: string; id: string }> =
    await tx.ledgerAccount.findMany({
      select: { code: true, id: true },
      where: { code: { in: ["2000", "3400"] }, tenantId: input.tenantId },
    })
  const cash = rows.find((row) => row.code === "2000")?.id
  const income = rows.find((row) => row.code === "3400")?.id
  if (!cash || !income) {
    throw ExpectedQueryError.precondition(
      "The cooperative's books are not set up yet. Finish setup first."
    )
  }

  const transactions: unknown[] = []
  const ledgerEntries: unknown[] = []
  let total = 0

  for (const entry of missing) {
    const amount = money(entry.allocatableProfitAmount)
    const id = randomUUID()
    total += amount
    transactions.push({
      id,
      idempotencyKey: businessProfitIdempotencyKey(entry.id),
      narration: `Profit to share from ${entry.shareBusiness.name}`,
      postedAt: entry.profitDate,
      reference: entry.shareBusiness.name,
      tenantId: input.tenantId,
      transactionType: "dividend",
    })
    ledgerEntries.push(
      {
        amount,
        direction: "debit",
        ledgerAccountId: cash,
        ledgerTransactionId: id,
        tenantId: input.tenantId,
      },
      {
        amount,
        direction: "credit",
        ledgerAccountId: income,
        ledgerTransactionId: id,
        tenantId: input.tenantId,
      }
    )
  }

  await tx.ledgerTransaction.createMany({ data: transactions })
  await tx.ledgerEntry.createMany({ data: ledgerEntries })
  await tx.auditLog.create({
    data: {
      action: "business.profit_season.profit_recognised",
      actorType: input.actorUserId ? "user" : "system",
      actorUserId: input.actorUserId ?? null,
      entityId: input.seasonId,
      entityType: "DividendPeriod",
      metadata: {
        profitEntryIds: missing.map((entry) => entry.id),
        total: money(total),
      },
      occurredAt: new Date(),
      tenantId: input.tenantId,
    },
  })

  return { created: missing.length, total: money(total) }
}

/**
 * Record "profit owed to members" for a shared season: one posting per
 * member, keyed by season and member, so calling it again posts nothing.
 * Runs inside the caller's transaction. Returns how many postings it made.
 */
export async function recordProfitOwedForSeason(
  input: { actorUserId?: string | null; seasonId: string; tenantId: string },
  tx: any
) {
  const period = await tx.dividendPeriod.findFirst({
    select: { name: true, publishedAt: true, status: true },
    where: { id: input.seasonId, tenantId: input.tenantId },
  })

  if (!period || period.status !== "published") return { created: 0, total: 0 }

  // Seasons brought in from before Halaalvest were settled outside it.
  const liveEntryCount = await tx.shareBusinessProfitEntry.count({
    where: {
      linkedDividendPeriodId: input.seasonId,
      sourceType: "manual",
      status: { not: "archived" },
      tenantId: input.tenantId,
    },
  })
  if (liveEntryCount === 0) return { created: 0, total: 0 }

  // Seasons closed before profit was posted at close catch up here.
  await recognizeSeasonBusinessProfit(input, tx)

  const allocations: Array<{ allocationAmount: unknown; memberId: string }> =
    await tx.dividendAllocation.findMany({
      select: { allocationAmount: true, memberId: true },
      where: { dividendPeriodId: input.seasonId, tenantId: input.tenantId },
    })
  const owed = allocations.filter((row) => money(row.allocationAmount) > 0)
  if (owed.length === 0) return { created: 0, total: 0 }

  const keys = owed.map((row) =>
    profitOwedIdempotencyKey(input.seasonId, row.memberId)
  )
  const existing: Array<{ idempotencyKey: string | null }> =
    await tx.ledgerTransaction.findMany({
      select: { idempotencyKey: true },
      where: { idempotencyKey: { in: keys }, tenantId: input.tenantId },
    })
  const done = new Set(existing.map((row) => row.idempotencyKey))
  const missing = owed.filter(
    (row) => !done.has(profitOwedIdempotencyKey(input.seasonId, row.memberId))
  )
  if (missing.length === 0) return { created: 0, total: 0 }

  const accounts = await getPayoutAccounts(tx, input.tenantId)
  const postedAt = new Date()
  const transactions: unknown[] = []
  const entries: unknown[] = []
  let total = 0

  for (const row of missing) {
    const amount = money(row.allocationAmount)
    const id = randomUUID()
    total += amount
    transactions.push({
      id,
      idempotencyKey: profitOwedIdempotencyKey(input.seasonId, row.memberId),
      memberId: row.memberId,
      narration: `Profit owed for ${period.name}`,
      postedAt,
      reference: period.name,
      tenantId: input.tenantId,
      transactionType: "dividend",
    })
    entries.push(
      {
        amount,
        direction: "debit",
        ledgerAccountId: accounts.equity,
        ledgerTransactionId: id,
        tenantId: input.tenantId,
      },
      {
        amount,
        direction: "credit",
        ledgerAccountId: accounts.owed,
        ledgerTransactionId: id,
        tenantId: input.tenantId,
      }
    )
  }

  await tx.ledgerTransaction.createMany({ data: transactions })
  await tx.ledgerEntry.createMany({ data: entries })
  await tx.auditLog.create({
    data: {
      action: "business.profit_season.owed_recorded",
      actorType: input.actorUserId ? "user" : "system",
      actorUserId: input.actorUserId ?? null,
      entityId: input.seasonId,
      entityType: "DividendPeriod",
      metadata: { memberCount: missing.length, total: money(total) },
      occurredAt: postedAt,
      tenantId: input.tenantId,
    },
  })

  return { created: missing.length, total: money(total) }
}

/** A season can be paid out once shared, and only if it is live profit. */
async function getPayableSeason(tx: any, tenantId: string, seasonId: string) {
  const [period, liveEntryCount] = await Promise.all([
    tx.dividendPeriod.findFirst({
      select: { id: true, name: true, status: true },
      where: { id: seasonId, tenantId },
    }),
    tx.shareBusinessProfitEntry.count({
      where: {
        linkedDividendPeriodId: seasonId,
        sourceType: "manual",
        status: { not: "archived" },
        tenantId,
      },
    }),
  ])

  if (!period) throw ExpectedQueryError.notFound("Season not found.")
  if (period.status !== "published") {
    throw ExpectedQueryError.precondition(
      "Share this season with members before paying it out."
    )
  }
  if (liveEntryCount === 0) {
    throw ExpectedQueryError.precondition(
      "This season was brought in from before the cooperative used Halaalvest, so it isn't paid out here."
    )
  }

  return period as { id: string; name: string; status: string }
}

export type PayOutProfitInput = {
  actorUserId: string
  commandId: string
  /** Where the money goes unless a member has an override. */
  destination: ProfitPayoutDestination
  /** One member (single payout); omit to pay everyone still owed. */
  memberId?: string | null
  note?: string | null
  /** Per-member destination, for a bulk payout. */
  overrides?: Record<string, ProfitPayoutDestination>
  /** Receipt or transfer reference for cash and bank payouts. */
  reference?: string | null
  seasonId: string
  tenantId: string
}

function cleanText(value: string | null | undefined, max: number) {
  const text = value?.trim()
  return text ? text.slice(0, max) : null
}

function assertDestination(value: unknown): ProfitPayoutDestination {
  if (profitPayoutDestinations.includes(value as ProfitPayoutDestination)) {
    return value as ProfitPayoutDestination
  }
  throw ExpectedQueryError.validation("Choose savings, cash or bank transfer.")
}

/**
 * Pay out a shared season: everyone still owed (bulk) or one member. Each
 * member is paid once; members already paid are skipped in a bulk payout and
 * refused in a single one. Owed postings are made first if the season was
 * shared before payouts existed.
 */
export async function payOutProfit(
  input: PayOutProfitInput,
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const destination = assertDestination(input.destination)
  const overrides = Object.fromEntries(
    Object.entries(input.overrides ?? {}).map(([memberId, value]) => [
      memberId,
      assertDestination(value),
    ])
  )
  const reference = cleanText(input.reference, 120)
  const note = cleanText(input.note, 500)
  await assertLivePayoutsOpen(prisma, input.tenantId)

  return runMobileAdminCommand(
    {
      actorUserId: input.actorUserId,
      commandFingerprint: JSON.stringify({
        destination,
        memberId: input.memberId ?? null,
        overrides,
        seasonId: input.seasonId,
      }),
      commandId: input.commandId,
      commandType: input.memberId
        ? "business.profit_payout.pay_member"
        : "business.profit_payout.pay_season",
      entityId: input.memberId
        ? `${input.seasonId}:${input.memberId}`
        : input.seasonId,
      expectedState: "owed",
      tenantId: input.tenantId,
      execute: async (client) => {
        try {
          return await (client as any).$transaction(
            (tx: any) =>
              payOutProfitInTransaction(
                { ...input, destination, note, overrides, reference },
                tx
              ),
            { maxWait: 5_000, timeout: 30_000 }
          )
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            throw ExpectedQueryError.conflict(
              "Someone else just paid out this season. Refresh to see who is paid."
            )
          }
          throw error
        }
      },
    },
    prisma
  )
}

type OwedRow = {
  allocationAmount: unknown
  member: { fullName: string }
  memberId: string
}

type ExistingPayout = {
  id: string
  memberId: string
  paidAt: Date
  payCount: number
  status: "paid" | "reversed"
}

async function payOutProfitInTransaction(
  input: PayOutProfitInput & {
    destination: ProfitPayoutDestination
    overrides: Record<string, ProfitPayoutDestination>
  },
  tx: any
) {
  const period = await getPayableSeason(tx, input.tenantId, input.seasonId)
  await recordProfitOwedForSeason(
    {
      actorUserId: input.actorUserId,
      seasonId: input.seasonId,
      tenantId: input.tenantId,
    },
    tx
  )

  const memberFilter = input.memberId ? { memberId: input.memberId } : {}
  const [owedRows, existingRows] = (await Promise.all([
    tx.dividendAllocation.findMany({
      select: {
        allocationAmount: true,
        member: { select: { fullName: true } },
        memberId: true,
      },
      where: {
        ...memberFilter,
        dividendPeriodId: input.seasonId,
        tenantId: input.tenantId,
      },
    }),
    tx.profitPayout.findMany({
      select: {
        id: true,
        memberId: true,
        paidAt: true,
        payCount: true,
        status: true,
      },
      where: {
        ...memberFilter,
        dividendPeriodId: input.seasonId,
        tenantId: input.tenantId,
      },
    }),
  ])) as [OwedRow[], ExistingPayout[]]

  const existingByMember = new Map(
    existingRows.map((row) => [row.memberId, row])
  )
  const toPay = owedRows.filter((row) => money(row.allocationAmount) > 0)

  if (input.memberId) {
    if (toPay.length === 0) {
      throw ExpectedQueryError.notFound(
        "This member has no profit share in this season."
      )
    }
    const paid = existingByMember.get(input.memberId)
    if (paid?.status === "paid") {
      throw ExpectedQueryError.conflict(
        `${toPay[0]?.member.fullName ?? "This member"} was already paid on ${paid.paidAt.toISOString().slice(0, 10)}.`
      )
    }
  }

  const unpaid = toPay.filter(
    (row) => existingByMember.get(row.memberId)?.status !== "paid"
  )

  if (unpaid.length === 0) {
    throw ExpectedQueryError.conflict(
      "Everyone in this season has already been paid."
    )
  }

  const accounts = await getPayoutAccounts(tx, input.tenantId)
  const paidAt = new Date()
  const newPayouts: unknown[] = []
  const contributions: unknown[] = []
  const transactions: unknown[] = []
  const entries: unknown[] = []
  const audits: unknown[] = []
  const savingsIncrements: Array<{ amount: number; id: string }> = []
  let total = 0

  for (const row of unpaid) {
    const amount = money(row.allocationAmount)
    const destination = input.overrides[row.memberId] ?? input.destination
    const previous = existingByMember.get(row.memberId)
    const payoutId = previous?.id ?? randomUUID()
    const payCount = previous ? previous.payCount + 1 : 1
    const transactionId = randomUUID()
    const contributionId = destination === "savings" ? randomUUID() : null
    const reference =
      destination === "savings" ? period.name : (input.reference ?? period.name)
    total += amount

    if (contributionId) {
      contributions.push({
        amount,
        channel: "manual",
        committedAmount: null,
        contributionPlanId: null,
        extraSavingsAmount: amount,
        id: contributionId,
        memberId: row.memberId,
        notes: `Profit share from ${period.name}.`,
        periodLabel: period.name,
        postedAt: paidAt,
        reference: `profit-share:${payoutId}`,
        status: "posted",
        tenantId: input.tenantId,
      })
      savingsIncrements.push({ amount, id: row.memberId })
    }

    transactions.push({
      contributionId,
      id: transactionId,
      idempotencyKey: profitPayoutIdempotencyKey(payoutId, payCount),
      memberId: row.memberId,
      narration: `Profit paid by ${destinationWords[destination]} for ${period.name}`,
      postedAt: paidAt,
      reference,
      tenantId: input.tenantId,
      transactionType: "dividend",
    })
    entries.push(
      {
        amount,
        direction: "debit",
        ledgerAccountId: accounts.owed,
        ledgerTransactionId: transactionId,
        tenantId: input.tenantId,
      },
      {
        amount,
        direction: "credit",
        ledgerAccountId:
          destination === "savings" ? accounts.savings : accounts.cash,
        ledgerTransactionId: transactionId,
        tenantId: input.tenantId,
      }
    )

    const payoutData = {
      amount,
      contributionId,
      destination,
      ledgerTransactionId: transactionId,
      note: input.note ?? null,
      paidAt,
      paidByUserId: input.actorUserId,
      payCount,
      reference: destination === "savings" ? null : (input.reference ?? null),
      status: "paid",
    }

    if (previous) {
      // Paying again after a reversal: claim the reversed row so a second
      // tab paying at the same time finds nothing to claim.
      const claim = await tx.profitPayout.updateMany({
        data: {
          ...payoutData,
          reversalLedgerTransactionId: null,
          reversalReason: null,
          reversedAt: null,
          reversedByUserId: null,
        },
        where: {
          id: previous.id,
          payCount: previous.payCount,
          status: "reversed",
          tenantId: input.tenantId,
        },
      })
      if (claim.count !== 1) {
        throw ExpectedQueryError.conflict(
          "Someone else just paid out this season. Refresh to see who is paid."
        )
      }
    } else {
      newPayouts.push({
        ...payoutData,
        dividendPeriodId: input.seasonId,
        id: payoutId,
        memberId: row.memberId,
        tenantId: input.tenantId,
      })
    }

    audits.push({
      action: "business.profit_payout.paid",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: payoutId,
      entityType: "ProfitPayout",
      metadata: {
        amount,
        contributionId,
        destination,
        ledgerTransactionId: transactionId,
        memberId: row.memberId,
        note: input.note ?? null,
        payCount,
        reference: payoutData.reference,
        seasonId: input.seasonId,
      },
      occurredAt: paidAt,
      tenantId: input.tenantId,
    })
  }

  // The unique (season, member) key refuses a second payout row. Savings
  // credits are written before the ledger postings that point at them.
  if (newPayouts.length) await tx.profitPayout.createMany({ data: newPayouts })
  if (contributions.length) {
    await tx.contribution.createMany({ data: contributions })
  }
  await tx.ledgerTransaction.createMany({ data: transactions })
  await tx.ledgerEntry.createMany({ data: entries })
  if (savingsIncrements.length) {
    await tx.$executeRaw`
      UPDATE members AS m SET
        total_savings_snapshot = m.total_savings_snapshot + v.amount,
        updated_at = ${paidAt.toISOString()}::timestamptz
      FROM jsonb_to_recordset(${JSON.stringify(savingsIncrements)}::jsonb)
        AS v(id uuid, amount numeric)
      WHERE m.id = v.id AND m.tenant_id = ${input.tenantId}::uuid
    `
  }
  await tx.auditLog.createMany({ data: audits })

  return {
    id: input.memberId ? `${input.seasonId}:${input.memberId}` : input.seasonId,
    state: `paid:${unpaid.length}:${money(total)}`,
  }
}

/**
 * Undo one payout: the money goes back to "owed" so the member can be paid
 * again. A savings payout is refused once the member has spent it from
 * savings (their extra savings would go below zero).
 */
export async function reverseProfitPayout(
  input: {
    actorUserId: string
    commandId: string
    payoutId: string
    reason: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const reason = cleanText(input.reason, 500)
  if (!reason) {
    throw ExpectedQueryError.validation("Say why this payout is being undone.")
  }
  await assertLivePayoutsOpen(prisma, input.tenantId)

  return runMobileAdminCommand(
    {
      actorUserId: input.actorUserId,
      commandFingerprint: JSON.stringify({ payoutId: input.payoutId }),
      commandId: input.commandId,
      commandType: "business.profit_payout.reverse",
      entityId: input.payoutId,
      expectedState: "paid",
      tenantId: input.tenantId,
      execute: async (client) =>
        (client as any).$transaction(
          (tx: any) =>
            reverseProfitPayoutInTransaction({ ...input, reason }, tx),
          { maxWait: 5_000, timeout: 15_000 }
        ),
    },
    prisma
  )
}

async function readMemberExtraSavings(
  tx: any,
  tenantId: string,
  memberId: string
) {
  const rows: Array<{ balance: string | null }> = await tx.$queryRaw`
    SELECT (
      coalesce((SELECT sum(special_savings_balance) FROM member_opening_balances
        WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
          AND status::text = 'applied'), 0)
      + coalesce((SELECT sum(extra_savings_amount) FROM contributions
        WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
          AND status::text = 'posted'), 0)
      - coalesce((SELECT sum(amount) FROM member_special_savings_withdrawals
        WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid), 0)
    )::text AS balance
  `
  return money(rows[0]?.balance)
}

async function reverseProfitPayoutInTransaction(
  input: {
    actorUserId: string
    payoutId: string
    reason: string
    tenantId: string
  },
  tx: any
) {
  const payout = await tx.profitPayout.findFirst({
    select: {
      amount: true,
      contributionId: true,
      destination: true,
      dividendPeriod: { select: { name: true } },
      dividendPeriodId: true,
      id: true,
      member: { select: { fullName: true } },
      memberId: true,
      payCount: true,
      status: true,
    },
    where: { id: input.payoutId, tenantId: input.tenantId },
  })

  if (!payout) throw ExpectedQueryError.notFound("Payout not found.")
  if (payout.status !== "paid") {
    throw ExpectedQueryError.conflict(
      "This payout was already undone. Refresh to see it."
    )
  }

  const amount = money(payout.amount)
  const destination = payout.destination as ProfitPayoutDestination
  const accounts = await getPayoutAccounts(tx, input.tenantId)
  const reversedAt = new Date()

  if (destination === "savings") {
    const balance = await readMemberExtraSavings(
      tx,
      input.tenantId,
      payout.memberId
    )
    if (balance + 0.005 < amount) {
      throw ExpectedQueryError.precondition(
        `${payout.member.fullName} has already used this money from savings, so this payout can't be undone.`
      )
    }
    const contribution = await tx.contribution.updateMany({
      data: { status: "reversed" },
      where: {
        id: payout.contributionId,
        status: "posted",
        tenantId: input.tenantId,
      },
    })
    if (contribution.count !== 1) {
      throw ExpectedQueryError.conflict(
        "This payout changed while you were looking. Refresh and try again."
      )
    }
    await tx.member.update({
      data: { totalSavingsSnapshot: { decrement: amount } },
      where: { id: payout.memberId, tenantId: input.tenantId },
    })
  }

  const transactionId = randomUUID()
  const claim = await tx.profitPayout.updateMany({
    data: {
      reversalLedgerTransactionId: transactionId,
      reversalReason: input.reason,
      reversedAt,
      reversedByUserId: input.actorUserId,
      status: "reversed",
    },
    where: {
      id: payout.id,
      payCount: payout.payCount,
      status: "paid",
      tenantId: input.tenantId,
    },
  })
  if (claim.count !== 1) {
    throw ExpectedQueryError.conflict(
      "This payout was already undone. Refresh to see it."
    )
  }

  await tx.ledgerTransaction.create({
    data: {
      entries: {
        create: [
          {
            amount,
            direction: "debit",
            ledgerAccountId:
              destination === "savings" ? accounts.savings : accounts.cash,
            tenantId: input.tenantId,
          },
          {
            amount,
            direction: "credit",
            ledgerAccountId: accounts.owed,
            tenantId: input.tenantId,
          },
        ],
      },
      id: transactionId,
      idempotencyKey: profitPayoutReversalIdempotencyKey(
        payout.id,
        payout.payCount
      ),
      memberId: payout.memberId,
      narration: `Profit payout undone for ${payout.dividendPeriod.name}: ${input.reason}`,
      postedAt: reversedAt,
      reference: payout.dividendPeriod.name,
      tenantId: input.tenantId,
      transactionType: "dividend",
    },
  })
  await tx.auditLog.create({
    data: {
      action: "business.profit_payout.reversed",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: payout.id,
      entityType: "ProfitPayout",
      metadata: {
        amount,
        destination,
        ledgerTransactionId: transactionId,
        memberId: payout.memberId,
        payCount: payout.payCount,
        reason: input.reason,
        seasonId: payout.dividendPeriodId,
      },
      occurredAt: reversedAt,
      tenantId: input.tenantId,
    },
  })

  return { id: payout.id, state: "reversed" }
}

export type MemberProfitPayout = {
  destination: ProfitPayoutDestination
  paidAt: string
  reference: string | null
}

/** A member's paid seasons, keyed by season id (paid payouts only). */
export async function getMemberProfitPayouts(
  input: { memberId: string; seasonIds: string[]; tenantId: string },
  prismaOverride?: PrismaClient
): Promise<Map<string, MemberProfitPayout>> {
  if (input.seasonIds.length === 0) return new Map()
  const prisma = getPrisma(prismaOverride) as any
  const rows: Array<{
    destination: ProfitPayoutDestination
    dividendPeriodId: string
    paidAt: Date
    reference: string | null
  }> = await prisma.profitPayout.findMany({
    select: {
      destination: true,
      dividendPeriodId: true,
      paidAt: true,
      reference: true,
    },
    where: {
      dividendPeriodId: { in: input.seasonIds },
      memberId: input.memberId,
      status: "paid",
      tenantId: input.tenantId,
    },
  })

  return new Map(
    rows.map((row) => [
      row.dividendPeriodId,
      {
        destination: row.destination,
        paidAt: row.paidAt.toISOString().slice(0, 10),
        reference: row.reference,
      },
    ])
  )
}

/** Plain words for where profit went: "to savings", "in cash", "by bank transfer". */
export function describeProfitPayoutDestination(
  destination: ProfitPayoutDestination
) {
  if (destination === "savings") return "to savings"
  if (destination === "cash") return "in cash"
  return "by bank transfer"
}
