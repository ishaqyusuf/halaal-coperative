import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import {
  assistantMessageLimit,
  estimatePlatformBill,
  formatPlatformBillingPeriod,
  mobileAccessLine,
  platformBillingPeriod,
  platformBillingPrices,
  platformBillTotal,
  previousPlatformBillingPeriod,
  seatFeeLine,
  validateAssistantMonthlyCap,
  assistantOverageLine,
  type PlatformBillLineDraft,
  type PlatformSeatFeePayer,
} from "@halaalvest/domain"
import { randomUUID } from "node:crypto"
import { createPrismaClient } from "../prisma"
import {
  ExpectedQueryError,
  isUniqueConstraintError,
  QueryInfrastructureError,
} from "../query-error"
import {
  assessCooperativeMobileAccessCharge,
  assessPlatformSeatFeeCharge,
} from "./charges"
import {
  mobileAccessExpenseAccountCode,
  platformBillsPayableAccountCode,
  platformFeesExpenseAccountCode,
} from "./cooperative-mobile-billing-constants"
import { lockCooperativeMobileBilling } from "./cooperative-mobile-billing-lock"
import {
  getLedgerAccountByCode,
  paymentReferenceIdempotencyKey,
  postLedgerTransaction,
} from "./ledger"
import { getTenantMigrationWriteAccess } from "./migration"

/**
 * Halaalvest's monthly bill to a cooperative (seat fee, website assistant
 * overage, mobile access). Rules: @halaalvest/domain platform-billing.
 * Plan: .brain/features/platform-billing.md.
 */

const currencyCode = "NGN"
const billingTimeZone = "Africa/Lagos"
const workLimit = 50
const statementLimit = 100
const qaSeatLimit = 500
const localDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: billingTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const billableTenant = {
  dataClassification: "live",
  qaPurgeStartedAt: null,
} as const
const financeReady = {
  initialMigrationStatus: { in: ["finalized", "live_operations"] },
} satisfies Prisma.TenantWhereInput
const financeReadyTenant = {
  ...billableTenant,
  ...financeReady,
} satisfies Prisma.TenantWhereInput

/** Live tenants always; QA tenants too when the caller allows them (non-production QA). */
function tenantScope(includeQa: boolean): Prisma.TenantWhereInput {
  return includeQa ? { qaPurgeStartedAt: null } : billableTenant
}

const billListSelect = {
  id: true,
  period: true,
  totalAmount: true,
  currencyCode: true,
  status: true,
  seatFeePayer: true,
  issuedAt: true,
  dueAt: true,
  paidAt: true,
  paymentReference: true,
  accrualPostedAt: true,
  remittancePostedAt: true,
  fundingSourceType: true,
  fundingSourceId: true,
  fundingSourceName: true,
  fundingChosenAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.PlatformBillSelect

type BillListRow = Prisma.PlatformBillGetPayload<{
  select: typeof billListSelect
}>

function requireDb(db?: PrismaClient) {
  const client = db ?? createPrismaClient()
  if (!client) throw new QueryInfrastructureError("Database not configured")
  return client
}

function localDay(now: Date) {
  const parts = Object.fromEntries(
    localDate.formatToParts(now).map(({ type, value }) => [type, value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function databaseDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`)
}

/** The last calendar day of `period`, as a database date (mobile `chargeDueAt`). */
export function platformBillingPeriodEnd(period: string) {
  const [year, month] = period.split("-").map(Number) as [number, number]
  return new Date(Date.UTC(year, month, 0))
}

/** The instant the Lagos month after `period` starts. */
function periodCloseInstant(period: string) {
  const [year, month] = period.split("-").map(Number) as [number, number]
  // Lagos is UTC+1 with no daylight saving.
  return new Date(Date.UTC(year, month, 1) - 60 * 60 * 1000)
}

function billSummary(bill: BillListRow) {
  return {
    id: bill.id,
    period: bill.period,
    periodLabel: formatPlatformBillingPeriod(bill.period),
    totalAmount: Number(bill.totalAmount),
    currencyCode: bill.currencyCode,
    status: bill.status,
    seatFeePayer: bill.seatFeePayer,
    issuedAt: bill.issuedAt,
    dueAt: bill.dueAt,
    paidAt: bill.paidAt,
    paymentReference: bill.paymentReference,
    accrualPostedAt: bill.accrualPostedAt,
    remittancePostedAt: bill.remittancePostedAt,
    fundingSource: bill.fundingSourceType
      ? {
          type: bill.fundingSourceType,
          id: bill.fundingSourceId,
          name: bill.fundingSourceName ?? "",
          chosenAt: bill.fundingChosenAt,
        }
      : null,
    mobileTermCount: bill._count.items,
  }
}

export type PlatformBillSummary = ReturnType<typeof billSummary>

/**
 * Money committed to Halaalvest bills that deployable funds must hold back:
 * every bill total, less mobile charges members have already paid back
 * separately (that cash never passed through contributions).
 */
export async function getMobileBillingCommitmentAmount(
  tenantId: string,
  db: Prisma.TransactionClient
) {
  if (
    typeof db.platformBill?.aggregate !== "function" ||
    typeof db.cooperativeMobileInvoiceItem?.aggregate !== "function"
  ) {
    return 0
  }

  const bill = { tenantId, tenant: billableTenant }
  const [billed, recovered] = await Promise.all([
    db.platformBill.aggregate({
      where: bill,
      _sum: { totalAmount: true },
    }),
    db.cooperativeMobileInvoiceItem.aggregate({
      where: {
        invoice: bill,
        chargeApplication: {
          tenantId,
          status: "posted",
          ledgerTransaction: { isNot: null },
        },
      },
      _sum: { amount: true },
    }),
  ])

  const net = billed._sum.totalAmount?.minus(recovered._sum.amount ?? 0)
  return Math.max(0, Number(net ?? 0))
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type PlatformBillingSettings = {
  seatFeePayer: PlatformSeatFeePayer
  assistantAutoBilling: boolean
  assistantMonthlyCap: number
}

const defaultSettings: PlatformBillingSettings = {
  seatFeePayer: "cooperative",
  assistantAutoBilling: false,
  assistantMonthlyCap: 0,
}

async function readSettings(
  tenantId: string,
  db: Prisma.TransactionClient
): Promise<PlatformBillingSettings> {
  const row = await db.tenantPlatformBillingSetting.findUnique({
    where: { tenantId },
    select: {
      seatFeePayer: true,
      assistantAutoBilling: true,
      assistantMonthlyCap: true,
    },
  })
  if (!row) return defaultSettings
  return {
    seatFeePayer: row.seatFeePayer,
    assistantAutoBilling: row.assistantAutoBilling,
    assistantMonthlyCap: Number(row.assistantMonthlyCap),
  }
}

export async function getPlatformBillingSettings(
  tenantId: string,
  override?: PrismaClient
) {
  return readSettings(tenantId, requireDb(override))
}

export async function updatePlatformBillingSettings(
  input: Partial<PlatformBillingSettings> & {
    tenantId: string
    actorUserId: string
  },
  override?: PrismaClient
) {
  if (input.assistantMonthlyCap !== undefined) {
    const problem = validateAssistantMonthlyCap(input.assistantMonthlyCap)
    if (problem) throw ExpectedQueryError.validation(problem)
  }
  const db = requireDb(override)
  return db.$transaction(async (tx) => {
    const before = await readSettings(input.tenantId, tx)
    const next: PlatformBillingSettings = {
      seatFeePayer: input.seatFeePayer ?? before.seatFeePayer,
      assistantAutoBilling:
        input.assistantAutoBilling ?? before.assistantAutoBilling,
      assistantMonthlyCap:
        input.assistantMonthlyCap ?? before.assistantMonthlyCap,
    }
    await tx.tenantPlatformBillingSetting.upsert({
      where: { tenantId: input.tenantId },
      create: {
        tenantId: input.tenantId,
        ...next,
        updatedByUserId: input.actorUserId,
      },
      update: { ...next, updatedByUserId: input.actorUserId },
    })
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "platform_billing.settings_updated",
        entityType: "TenantPlatformBillingSetting",
        entityId: input.tenantId,
        metadata: { before, after: next },
        occurredAt: new Date(),
      },
    })
    return next
  })
}

// ---------------------------------------------------------------------------
// Website assistant metering
// ---------------------------------------------------------------------------

/**
 * Counts one staff website assistant message for the tenant's Lagos month,
 * inside the caller's transaction. One conditional upsert, so concurrent
 * messages cannot pass the limit. Throws a precondition error at the limit.
 */
export async function meterPlatformAssistantMessage(
  tx: Prisma.TransactionClient,
  input: { tenantId: string; now?: Date }
) {
  const period = platformBillingPeriod(input.now ?? new Date())
  const settings = await readSettings(input.tenantId, tx)
  const limit = assistantMessageLimit(settings)
  const free = platformBillingPrices.assistantFreeMessages
  const rows = await tx.$queryRaw<{ messages: number }[]>`
    INSERT INTO "platform_assistant_usage" ("tenant_id", "period", "messages", "billable_messages", "updated_at")
    VALUES (${input.tenantId}::uuid, ${period}, 1, ${free < 1 ? 1 : 0}, now())
    ON CONFLICT ("tenant_id", "period") DO UPDATE SET
      "messages" = "platform_assistant_usage"."messages" + 1,
      "billable_messages" = "platform_assistant_usage"."billable_messages"
        + CASE WHEN "platform_assistant_usage"."messages" + 1 > ${free} THEN 1 ELSE 0 END,
      "updated_at" = now()
    WHERE "platform_assistant_usage"."messages" < ${limit}
    RETURNING "messages"`
  if (rows.length) return { period, messages: Number(rows[0]!.messages), limit }
  throw ExpectedQueryError.precondition(
    settings.assistantAutoBilling
      ? `Your cooperative has reached this month's assistant cap (${limit} messages). An admin can raise the cap in Billing.`
      : `Your cooperative has used this month's ${free} free assistant messages. An admin can turn on assistant billing in Billing.`
  )
}

// ---------------------------------------------------------------------------
// Month close
// ---------------------------------------------------------------------------

type IssueInput = {
  tenantId: string
  period: string
  now: Date
  includeQa?: boolean
}

/**
 * Issues `period`'s bill for one cooperative. Safe to repeat: an existing bill
 * is left alone (unless late mobile terms arrived, which is reported).
 */
async function issuePlatformBill(input: IssueInput, db: PrismaClient) {
  return db.$transaction(
    async (tx) => {
      await lockCooperativeMobileBilling(tx, input.tenantId)
      const chargeDueAt = platformBillingPeriodEnd(input.period)
      const unbilledTerms = await tx.cooperativeMobileAccessTerm.findMany({
        where: {
          tenantId: input.tenantId,
          chargeDueAt,
          currencyCode,
          approvedAt: { not: null },
          billingItem: null,
        },
        select: { id: true, amount: true },
      })
      const existing = await tx.platformBill.findUnique({
        where: {
          tenantId_period: { tenantId: input.tenantId, period: input.period },
        },
        select: { id: true },
      })
      if (existing) {
        if (unbilledTerms.length)
          throw new QueryInfrastructureError(
            "Approved mobile access terms arrived after their bill was issued."
          )
        return null
      }

      const tenant = await tx.tenant.findFirst({
        where: {
          id: input.tenantId,
          ...tenantScope(Boolean(input.includeQa)),
        },
        select: { id: true },
      })
      if (!tenant) return null

      // Sequential: one connection per transaction.
      const settings = await readSettings(input.tenantId, tx)
      const members = await tx.member.findMany({
        where: { tenantId: input.tenantId, status: "active" },
        select: { id: true },
        orderBy: { id: "asc" },
      })
      const usage = await tx.platformAssistantUsage.findUnique({
        where: {
          tenantId_period: { tenantId: input.tenantId, period: input.period },
        },
        select: { messages: true, billableMessages: true },
      })

      const lines = [
        seatFeeLine(members.length),
        assistantOverageLine(usage?.billableMessages ?? 0),
        mobileAccessLine(
          unbilledTerms.map((term) => ({ amount: Number(term.amount) }))
        ),
      ].filter((line): line is PlatformBillLineDraft => line !== null)
      const totalAmount = platformBillTotal(lines)

      const bill = await tx.platformBill.create({
        data: {
          tenantId: input.tenantId,
          period: input.period,
          currencyCode,
          totalAmount,
          status: totalAmount > 0 ? "issued" : "no_charge",
          seatFeePayer: settings.seatFeePayer,
          issuedAt: input.now,
          dueAt: databaseDate(localDay(input.now)),
          lines: { createMany: { data: lines } },
          seats: {
            createMany: {
              data: members.map((member) => ({
                tenantId: input.tenantId,
                memberId: member.id,
                amount: platformBillingPrices.seatFee,
              })),
            },
          },
          items: {
            createMany: {
              data: unbilledTerms.map((term) => ({
                termId: term.id,
                amount: term.amount,
                chargeDueAt,
              })),
            },
          },
        },
        select: { id: true },
      })
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorType: "system",
          action: "platform_billing.bill_issued",
          entityType: "PlatformBill",
          entityId: bill.id,
          metadata: {
            period: input.period,
            currencyCode,
            totalAmount: totalAmount.toFixed(2),
            seats: members.length,
            seatFeePayer: settings.seatFeePayer,
            assistantMessages: usage?.messages ?? 0,
            assistantBillableMessages: usage?.billableMessages ?? 0,
            mobileTerms: unbilledTerms.length,
          },
          occurredAt: input.now,
        },
      })
      return bill.id
    },
    { isolationLevel: "ReadCommitted" }
  )
}

async function ensureBillingAccounts(
  tenantId: string,
  tx: Prisma.TransactionClient
) {
  const account = (
    code: string,
    name: string,
    accountType: "expense" | "liability"
  ) =>
    tx.ledgerAccount.upsert({
      where: { tenantId_code: { tenantId, code } },
      create: { tenantId, code, name, accountType, isSystem: true },
      update: {},
    })
  const mobileExpense = await account(
    mobileAccessExpenseAccountCode,
    "Mobile app access cost",
    "expense"
  )
  const platformExpense = await account(
    platformFeesExpenseAccountCode,
    "Halaalvest platform fees",
    "expense"
  )
  const payable = await account(
    platformBillsPayableAccountCode,
    "Halaalvest bills payable",
    "liability"
  )
  if (
    !mobileExpense.isSystem ||
    mobileExpense.accountType !== "expense" ||
    !platformExpense.isSystem ||
    platformExpense.accountType !== "expense" ||
    !payable.isSystem ||
    payable.accountType !== "liability"
  ) {
    throw new QueryInfrastructureError(
      "Platform billing ledger accounts are unavailable."
    )
  }
  return { mobileExpense, platformExpense, payable }
}

async function applyMobileMemberAssessment(
  itemId: string,
  db: PrismaClient,
  includeQa = false
) {
  return db.$transaction(
    async (tx) => {
      const item = await tx.cooperativeMobileInvoiceItem.findFirst({
        where: {
          id: itemId,
          chargeApplicationId: null,
          term: { tenant: { ...tenantScope(includeQa), ...financeReady } },
        },
        select: {
          id: true,
          amount: true,
          chargeDueAt: true,
          term: { select: { id: true, tenantId: true, memberId: true } },
        },
      })
      if (!item) return false

      const txDb = tx as PrismaClient
      const writeAccess = await getTenantMigrationWriteAccess(
        item.term.tenantId,
        txDb
      )
      if (!writeAccess.canUseLiveFinancialWrites) return false
      await ensureBillingAccounts(item.term.tenantId, tx)
      const assessment = await assessCooperativeMobileAccessCharge(
        {
          tenantId: item.term.tenantId,
          memberId: item.term.memberId,
          termId: item.term.id,
          amount: Number(item.amount),
          dueAt: item.chargeDueAt,
        },
        txDb
      )
      await tx.cooperativeMobileInvoiceItem.update({
        where: { id: item.id },
        data: { chargeApplicationId: assessment.id },
      })
      return true
    },
    { isolationLevel: "Serializable" }
  )
}

/** Members pay: deduct the seat fee from one counted member's savings. */
async function applySeatCharge(
  seatId: string,
  db: PrismaClient,
  includeQa = false
) {
  return db.$transaction(
    async (tx) => {
      const seat = await tx.platformBillSeat.findFirst({
        where: {
          id: seatId,
          chargeApplicationId: null,
          bill: {
            seatFeePayer: "members",
            tenant: { ...tenantScope(includeQa), ...financeReady },
          },
        },
        select: {
          id: true,
          tenantId: true,
          memberId: true,
          amount: true,
          bill: { select: { period: true } },
        },
      })
      if (!seat) return false

      const txDb = tx as PrismaClient
      const writeAccess = await getTenantMigrationWriteAccess(
        seat.tenantId,
        txDb
      )
      if (!writeAccess.canUseLiveFinancialWrites) return false
      await ensureBillingAccounts(seat.tenantId, tx)
      const assessment = await assessPlatformSeatFeeCharge(
        {
          tenantId: seat.tenantId,
          memberId: seat.memberId,
          seatId: seat.id,
          amount: Number(seat.amount),
          assessedAt: platformBillingPeriodEnd(seat.bill.period),
        },
        txDb
      )
      await tx.platformBillSeat.update({
        where: { id: seat.id },
        data: { chargeApplicationId: assessment.id },
      })
      return true
    },
    { isolationLevel: "Serializable" }
  )
}

function fundingNarration(bill: {
  fundingSourceType: "charge" | "business" | null
  fundingSourceName: string | null
}) {
  if (!bill.fundingSourceType) return "source not chosen"
  return `paid from ${bill.fundingSourceType} "${bill.fundingSourceName ?? ""}"`
}

async function postBillAccounting(
  billId: string,
  db: PrismaClient,
  now: Date,
  includeQa = false
) {
  return db.$transaction(
    async (tx) => {
      const bill = await tx.platformBill.findFirst({
        where: {
          id: billId,
          tenant: { ...tenantScope(includeQa), ...financeReady },
        },
        include: { lines: true },
      })
      if (!bill) return false
      const needsAccrual = !bill.accrualPostedAt
      const needsRemittance = bill.paidAt !== null && !bill.remittancePostedAt
      if (!needsAccrual && !needsRemittance) return false

      const txDb = tx as PrismaClient
      const writeAccess = await getTenantMigrationWriteAccess(
        bill.tenantId,
        txDb
      )
      if (!writeAccess.canUseLiveFinancialWrites) return false
      const { mobileExpense, platformExpense, payable } =
        await ensureBillingAccounts(bill.tenantId, tx)
      const amount = Number(bill.totalAmount)
      const label = formatPlatformBillingPeriod(bill.period)

      if (needsAccrual && amount > 0) {
        const mobileAmount = bill.lines
          .filter((line) => line.kind === "mobile_access")
          .reduce((sum, line) => sum + Number(line.amount), 0)
        const platformAmount = Math.round((amount - mobileAmount) * 100) / 100
        await postLedgerTransaction(
          {
            tenantId: bill.tenantId,
            transactionType: "adjustment",
            postedAt: bill.issuedAt,
            narration: `Halaalvest bill for ${label}`,
            idempotencyKey: `platform-bill:${bill.id}`,
            migrationWriteGuardValidated: true,
            entries: [
              ...(platformAmount > 0
                ? [
                    {
                      ledgerAccountId: platformExpense.id,
                      direction: "debit" as const,
                      amount: platformAmount,
                    },
                  ]
                : []),
              ...(mobileAmount > 0
                ? [
                    {
                      ledgerAccountId: mobileExpense.id,
                      direction: "debit" as const,
                      amount: mobileAmount,
                    },
                  ]
                : []),
              { ledgerAccountId: payable.id, direction: "credit", amount },
            ],
          },
          txDb
        )
      }

      if (needsRemittance) {
        if (!bill.paidAt || !bill.paymentReference) {
          throw new QueryInfrastructureError(
            "Platform bill is missing payment evidence."
          )
        }
        const cash = await getLedgerAccountByCode(bill.tenantId, "2000", txDb)
        if (!cash)
          throw new QueryInfrastructureError(
            "Cooperative cash ledger account is unavailable."
          )
        await postLedgerTransaction(
          {
            tenantId: bill.tenantId,
            transactionType: "adjustment",
            postedAt: bill.paidAt,
            reference: bill.paymentReference,
            narration: `Halaalvest bill for ${label}, ${fundingNarration(bill)}`,
            idempotencyKey: paymentReferenceIdempotencyKey(
              bill.paymentReference
            ),
            migrationWriteGuardValidated: true,
            entries: [
              { ledgerAccountId: payable.id, direction: "debit", amount },
              { ledgerAccountId: cash.id, direction: "credit", amount },
            ],
          },
          txDb
        )
      }

      await tx.platformBill.update({
        where: { id: bill.id },
        data: {
          ...(needsAccrual ? { accrualPostedAt: now } : {}),
          ...(needsRemittance ? { remittancePostedAt: now } : {}),
        },
      })
      return true
    },
    { isolationLevel: "Serializable" }
  )
}

type CloseFailure = {
  operation: "bill" | "seat" | "assessment" | "accounting"
  id: string
}

/**
 * The daily job. Issues last month's bill for every billable cooperative,
 * then retries member charges and ledger postings. Every step is idempotent.
 */
export async function processPlatformBilling(
  now = new Date(),
  override?: PrismaClient
) {
  const db = requireDb(override)
  const currentPeriod = platformBillingPeriod(now)
  const period = previousPlatformBillingPeriod(currentPeriod)
  const firstOfMonth = databaseDate(`${currentPeriod}-01`)
  const result = {
    period,
    bills: 0,
    seatCharges: 0,
    memberAssessments: 0,
    ledgerPostings: 0,
    failures: [] as CloseFailure[],
  }

  const work = new Map<string, Set<string>>()
  const add = (tenantId: string, billPeriod: string) => {
    const periods = work.get(tenantId) ?? new Set<string>()
    periods.add(billPeriod)
    work.set(tenantId, periods)
  }
  const [tenantsWithoutBill, lateTerms] = await Promise.all([
    db.tenant.findMany({
      where: {
        ...billableTenant,
        status: { not: "archived" },
        createdAt: { lt: periodCloseInstant(period) },
        platformBills: { none: { period } },
      },
      orderBy: { id: "asc" },
      take: workLimit,
      select: { id: true },
    }),
    // Months the job missed: approved terms still unbilled.
    db.cooperativeMobileAccessTerm.groupBy({
      by: ["tenantId", "chargeDueAt"],
      where: {
        approvedAt: { not: null },
        chargeDueAt: { lt: firstOfMonth },
        currencyCode,
        billingItem: null,
        tenant: billableTenant,
      },
      orderBy: [{ chargeDueAt: "asc" }, { tenantId: "asc" }],
      take: workLimit,
    }),
  ])
  for (const tenant of tenantsWithoutBill) add(tenant.id, period)
  for (const group of lateTerms)
    if (group.chargeDueAt)
      add(group.tenantId, group.chargeDueAt.toISOString().slice(0, 7))

  for (const [tenantId, periods] of work) {
    for (const billPeriod of [...periods].sort()) {
      try {
        if (await issuePlatformBill({ tenantId, period: billPeriod, now }, db))
          result.bills++
      } catch {
        result.failures.push({ operation: "bill", id: tenantId })
      }
    }
  }

  const [pendingSeats, pendingAssessments, pendingAccounting] =
    await Promise.all([
      db.platformBillSeat.findMany({
        where: {
          chargeApplicationId: null,
          bill: { seatFeePayer: "members", tenant: financeReadyTenant },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: workLimit,
        select: { id: true },
      }),
      db.cooperativeMobileInvoiceItem.findMany({
        where: {
          chargeApplicationId: null,
          term: { tenant: financeReadyTenant },
        },
        orderBy: [{ chargeDueAt: "asc" }, { id: "asc" }],
        take: workLimit,
        select: { id: true },
      }),
      db.platformBill.findMany({
        where: {
          tenant: financeReadyTenant,
          OR: [
            { accrualPostedAt: null },
            { status: "paid", remittancePostedAt: null },
          ],
        },
        orderBy: [{ issuedAt: "asc" }, { id: "asc" }],
        take: workLimit,
        select: { id: true },
      }),
    ])

  for (const seat of pendingSeats) {
    try {
      if (await applySeatCharge(seat.id, db)) result.seatCharges++
    } catch {
      result.failures.push({ operation: "seat", id: seat.id })
    }
  }
  for (const item of pendingAssessments) {
    try {
      if (await applyMobileMemberAssessment(item.id, db))
        result.memberAssessments++
    } catch {
      result.failures.push({ operation: "assessment", id: item.id })
    }
  }
  for (const bill of pendingAccounting) {
    try {
      if (await postBillAccounting(bill.id, db, now)) result.ledgerPostings++
    } catch {
      result.failures.push({ operation: "accounting", id: bill.id })
    }
  }
  return result
}

/**
 * QA only (non-production, QA cooperative): issue this month's bill now and
 * run its member charges and accounting, so the flow can be checked in the
 * browser. The router enforces the QA session and environment.
 */
export async function issueQaPlatformBill(
  input: { tenantId: string; actorUserId: string; now?: Date },
  override?: PrismaClient
) {
  const db = requireDb(override)
  const now = input.now ?? new Date()
  const tenant = await db.tenant.findFirst({
    where: {
      id: input.tenantId,
      dataClassification: "qa",
      qaPurgeStartedAt: null,
    },
    select: { id: true },
  })
  if (!tenant)
    throw ExpectedQueryError.permission(
      "Issuing a bill on demand is only for QA cooperatives."
    )
  const period = platformBillingPeriod(now)
  const closed = await closePlatformBillForTenant(
    { tenantId: input.tenantId, period, now, includeQa: true },
    db
  )
  if (!closed)
    throw ExpectedQueryError.conflict(
      `${formatPlatformBillingPeriod(period)} already has a bill.`
    )
  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: "user",
      action: "platform_billing.qa_bill_issued",
      entityType: "PlatformBill",
      entityId: closed.billId,
      metadata: { period },
      occurredAt: now,
    },
  })
  return { ...closed, period }
}

/**
 * Closes one cooperative's month at once: issues the bill, then runs its
 * member charges and accounting. Returns null when the bill already exists or
 * the tenant is out of scope. Used by the QA action and tests; the daily job
 * runs the same steps across tenants.
 */
export async function closePlatformBillForTenant(
  input: IssueInput,
  override?: PrismaClient
) {
  const db = requireDb(override)
  const includeQa = Boolean(input.includeQa)
  const billId = await issuePlatformBill(input, db)
  if (!billId) return null
  const [seats, items] = await Promise.all([
    db.platformBillSeat.findMany({
      where: { billId, chargeApplicationId: null },
      take: qaSeatLimit,
      select: { id: true },
    }),
    db.cooperativeMobileInvoiceItem.findMany({
      where: { invoiceId: billId, chargeApplicationId: null },
      take: qaSeatLimit,
      select: { id: true },
    }),
  ])
  let seatCharges = 0
  for (const seat of seats)
    if (await applySeatCharge(seat.id, db, includeQa)) seatCharges++
  for (const item of items)
    await applyMobileMemberAssessment(item.id, db, includeQa)
  const accrued = await postBillAccounting(billId, db, input.now, includeQa)
  return { billId, seatCharges, accrued }
}

// ---------------------------------------------------------------------------
// Reads for the billing page
// ---------------------------------------------------------------------------

export async function listPlatformBills(
  tenantId: string,
  override?: PrismaClient
) {
  const bills = await requireDb(override).platformBill.findMany({
    where: { tenantId },
    select: billListSelect,
    orderBy: { period: "desc" },
    take: statementLimit,
  })
  return bills.map(billSummary)
}

export async function getPlatformBill(
  input: { tenantId: string; billId: string },
  override?: PrismaClient
) {
  const bill = await requireDb(override).platformBill.findFirst({
    where: { id: input.billId, tenantId: input.tenantId },
    select: {
      ...billListSelect,
      lines: {
        orderBy: { kind: "asc" },
        select: {
          kind: true,
          description: true,
          quantity: true,
          unitAmount: true,
          amount: true,
        },
      },
      items: {
        orderBy: [{ chargeDueAt: "asc" }, { id: "asc" }],
        take: statementLimit,
        select: {
          id: true,
          amount: true,
          chargeApplicationId: true,
          term: { select: { member: { select: { fullName: true } } } },
        },
      },
      _count: { select: { items: true, seats: true } },
    },
  })
  if (!bill) throw ExpectedQueryError.notFound("Bill not found.")
  const { items, lines, ...summary } = bill
  const chargedSeats =
    bill.seatFeePayer === "members"
      ? await requireDb(override).platformBillSeat.count({
          where: { billId: bill.id, chargeApplicationId: { not: null } },
        })
      : 0
  return {
    ...billSummary(summary),
    seatCount: bill._count.seats,
    chargedSeats,
    lines: lines.map((line) => ({
      kind: line.kind,
      description: line.description,
      quantity: line.quantity,
      unitAmount: Number(line.unitAmount),
      amount: Number(line.amount),
    })),
    mobileItems: items.map((item) => ({
      id: item.id,
      memberName: item.term.member.fullName,
      amount: Number(item.amount),
      chargeAssessed: item.chargeApplicationId !== null,
    })),
  }
}

/** The billing page header: this month so far, the settings and allowance. */
export async function getPlatformBillingOverview(
  input: { tenantId: string; now?: Date },
  override?: PrismaClient
) {
  const db = requireDb(override)
  const now = input.now ?? new Date()
  const period = platformBillingPeriod(now)
  const [settings, seats, usage, terms, currentBill, tenant] = await Promise.all([
    readSettings(input.tenantId, db),
    db.member.count({ where: { tenantId: input.tenantId, status: "active" } }),
    db.platformAssistantUsage.findUnique({
      where: { tenantId_period: { tenantId: input.tenantId, period } },
      select: { messages: true, billableMessages: true },
    }),
    db.cooperativeMobileAccessTerm.findMany({
      where: {
        tenantId: input.tenantId,
        chargeDueAt: platformBillingPeriodEnd(period),
        currencyCode,
        approvedAt: { not: null },
        billingItem: null,
      },
      select: { amount: true },
      take: 1000,
    }),
    db.platformBill.findUnique({
      where: { tenantId_period: { tenantId: input.tenantId, period } },
      select: { id: true },
    }),
    db.tenant.findUnique({
      where: { id: input.tenantId },
      select: { dataClassification: true },
    }),
  ])
  const estimate = estimatePlatformBill({
    seats,
    assistantBillableMessages: usage?.billableMessages ?? 0,
    mobileTerms: terms.map((term) => ({ amount: Number(term.amount) })),
  })
  return {
    period,
    periodLabel: formatPlatformBillingPeriod(period),
    currentBillId: currentBill?.id ?? null,
    qaTenant: tenant?.dataClassification === "qa",
    settings,
    prices: platformBillingPrices,
    seats,
    assistant: {
      messages: usage?.messages ?? 0,
      billableMessages: usage?.billableMessages ?? 0,
      freeMessages: platformBillingPrices.assistantFreeMessages,
      limit: assistantMessageLimit(settings),
    },
    mobileTerms: terms.length,
    estimate,
  }
}

// ---------------------------------------------------------------------------
// Paying from a chosen source
// ---------------------------------------------------------------------------

export type PlatformBillFundingSource = {
  type: "charge" | "business"
  id: string
  name: string
  /** Collected (charges) or recorded profit (businesses). */
  received: number
  /** Halaalvest bills already paid from it. */
  paidOut: number
  available: number
}

export async function listPlatformBillFundingSources(
  tenantId: string,
  override?: PrismaClient
): Promise<PlatformBillFundingSource[]> {
  const db = requireDb(override)
  const [charges, collected, businesses, paid] = await Promise.all([
    db.chargeDefinition.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: statementLimit,
    }),
    db.chargeApplication.groupBy({
      by: ["chargeDefinitionId"],
      where: { tenantId, status: "posted" },
      _sum: { amount: true },
    }),
    db.shareBusiness.findMany({
      where: { tenantId, status: { not: "archived" } },
      select: { id: true, name: true, profitAmount: true },
      orderBy: { name: "asc" },
      take: statementLimit,
    }),
    db.platformBill.groupBy({
      by: ["fundingSourceType", "fundingSourceId"],
      where: { tenantId, status: "paid", fundingSourceId: { not: null } },
      _sum: { totalAmount: true },
    }),
  ])
  const collectedBy = new Map(
    collected.map((row) => [row.chargeDefinitionId, Number(row._sum.amount ?? 0)])
  )
  const paidBy = new Map(
    paid.map((row) => [
      `${row.fundingSourceType}:${row.fundingSourceId}`,
      Number(row._sum.totalAmount ?? 0),
    ])
  )
  const source = (
    type: "charge" | "business",
    id: string,
    name: string,
    received: number
  ): PlatformBillFundingSource => {
    const paidOut = paidBy.get(`${type}:${id}`) ?? 0
    return {
      type,
      id,
      name,
      received,
      paidOut,
      available: Math.round((received - paidOut) * 100) / 100,
    }
  }
  return [
    ...charges.map((charge) =>
      source("charge", charge.id, charge.name, collectedBy.get(charge.id) ?? 0)
    ),
    ...businesses.map((business) =>
      source("business", business.id, business.name, Number(business.profitAmount))
    ),
  ]
}

/** Saves which of the cooperative's funds will pay an unpaid bill. */
export async function choosePlatformBillFundingSource(
  input: {
    tenantId: string
    billId: string
    actorUserId: string
    sourceType: "charge" | "business"
    sourceId: string
  },
  override?: PrismaClient
) {
  const db = requireDb(override)
  return db.$transaction(async (tx) => {
    const source =
      input.sourceType === "charge"
        ? await tx.chargeDefinition.findFirst({
            where: { id: input.sourceId, tenantId: input.tenantId },
            select: { id: true, name: true },
          })
        : await tx.shareBusiness.findFirst({
            where: {
              id: input.sourceId,
              tenantId: input.tenantId,
              status: { not: "archived" },
            },
            select: { id: true, name: true },
          })
    if (!source)
      throw ExpectedQueryError.notFound("Choose one of your charges or businesses.")
    const now = new Date()
    const updated = await tx.platformBill.updateMany({
      where: { id: input.billId, tenantId: input.tenantId, status: "issued" },
      data: {
        fundingSourceType: input.sourceType,
        fundingSourceId: source.id,
        fundingSourceName: source.name.slice(0, 200),
        fundingChosenAt: now,
        fundingChosenByUserId: input.actorUserId,
      },
    })
    if (!updated.count)
      throw ExpectedQueryError.precondition(
        "Only an unpaid bill can change where its money comes from."
      )
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "platform_billing.funding_source_chosen",
        entityType: "PlatformBill",
        entityId: input.billId,
        metadata: {
          sourceType: input.sourceType,
          sourceId: source.id,
          sourceName: source.name,
        },
        occurredAt: now,
      },
    })
    return { type: input.sourceType, id: source.id, name: source.name }
  })
}

// ---------------------------------------------------------------------------
// Platform owners and payments
// ---------------------------------------------------------------------------

async function requireBillingOperator(
  db: Prisma.TransactionClient,
  actorUserId: string
) {
  const actor = await db.user.findFirst({
    where: { id: actorUserId, isPlatformOwner: true, deletedAt: null },
    select: { id: true },
  })
  if (!actor)
    throw ExpectedQueryError.permission("Platform billing access is required.")
}

/** Every cooperative's bills. The router allows platform owners only. */
export async function listPlatformBillReceivables(
  input: { includeQa?: boolean } = {},
  override?: PrismaClient
) {
  const db = requireDb(override)
  const bills = await db.platformBill.findMany({
    where: {
      tenant: tenantScope(Boolean(input.includeQa)),
      status: { not: "no_charge" },
    },
    select: {
      ...billListSelect,
      tenantId: true,
      tenant: { select: { name: true, dataClassification: true } },
    },
    orderBy: [{ status: "asc" }, { period: "desc" }, { id: "asc" }],
    take: statementLimit,
  })
  return bills.map(({ tenant, tenantId, ...bill }) => ({
    ...billSummary(bill),
    tenantId,
    tenantName: tenant.name,
    tenantClassification: tenant.dataClassification,
  }))
}

type Remittance = { billId: string; reference: string; paidAt: string }
type VerifiedPaystackPayment = {
  mode: "test" | "live"
  amount: number
  currency: string
}

export function recordPlatformBillRemittance(
  input: Remittance & { actorUserId: string; includeQa?: boolean },
  override?: PrismaClient
) {
  return recordRemittance(
    input,
    { actorUserId: input.actorUserId },
    Boolean(input.includeQa),
    override
  )
}

export function recordVerifiedPlatformBillPaystackPayment(
  input: Remittance & VerifiedPaystackPayment,
  override?: PrismaClient
) {
  return recordRemittance(input, { paystack: input }, false, override)
}

async function recordRemittance(
  input: Remittance,
  source: { actorUserId: string } | { paystack: VerifiedPaystackPayment },
  includeQa: boolean,
  override?: PrismaClient
) {
  const db = requireDb(override)
  const summary = await claimRemittance(input, source, includeQa, db)
  // The daily job stays the retry path. Posting here keeps the books current
  // after a payment without an hourly schedule waking the database.
  if (summary.status === "paid" && !summary.remittancePostedAt) {
    await postBillAccounting(summary.id, db, new Date(), includeQa).catch(
      () => false
    )
  }
  return summary
}

async function claimRemittance(
  input: Remittance,
  source: { actorUserId: string } | { paystack: VerifiedPaystackPayment },
  includeQa: boolean,
  db: PrismaClient
) {
  const now = new Date()
  const reference = input.reference.trim()
  const paidAt = databaseDate(input.paidAt)
  if (
    !reference ||
    reference.length > 120 ||
    !Number.isFinite(paidAt.valueOf()) ||
    paidAt.toISOString().slice(0, 10) !== input.paidAt ||
    input.paidAt > localDay(now)
  ) {
    throw ExpectedQueryError.validation(
      "Enter a valid payment reference and date."
    )
  }
  const paymentKey = reference.toLowerCase()
  try {
    return await db.$transaction(
      async (tx) => {
        const paystack = "paystack" in source ? source.paystack : null
        if ("actorUserId" in source)
          await requireBillingOperator(tx, source.actorUserId)
        const bill = await tx.platformBill.findFirst({
          where: { id: input.billId, tenant: tenantScope(includeQa) },
          select: { ...billListSelect, tenantId: true, paymentKey: true },
        })
        if (!bill) throw ExpectedQueryError.notFound("Bill not found.")
        if (bill.status === "no_charge")
          throw ExpectedQueryError.precondition("This bill has nothing to pay.")
        if (paystack) {
          const checkout = await tx.platformBillPaystackCheckout.findUnique({
            where: { reference },
          })
          if (
            checkout?.invoiceId !== bill.id ||
            checkout.mode !== paystack.mode ||
            bill.currencyCode !== paystack.currency ||
            !bill.totalAmount.times(100).equals(paystack.amount)
          ) {
            throw ExpectedQueryError.validation(
              "The verified Paystack payment does not match this bill."
            )
          }
          if (checkout.verifiedAt) return billSummary(bill)
        }
        if (input.paidAt < localDay(bill.issuedAt)) {
          throw ExpectedQueryError.validation(
            "Payment date cannot precede the bill."
          )
        }
        if (bill.status === "paid") {
          if (
            bill.paymentKey === paymentKey &&
            bill.paidAt?.valueOf() === paidAt.valueOf()
          ) {
            return billSummary(bill)
          }
          if (!paystack)
            throw ExpectedQueryError.conflict(
              "This bill already has a recorded payment."
            )
          await tx.platformBillPaystackCheckout.update({
            where: { reference },
            data: { verifiedAt: now },
          })
          await tx.auditLog.create({
            data: {
              tenantId: bill.tenantId,
              actorType: "system",
              action: "platform_billing.paystack_duplicate_payment",
              entityType: "PlatformBill",
              entityId: bill.id,
              metadata: { reference, paidAt: input.paidAt },
              occurredAt: now,
            },
          })
          return billSummary(bill)
        }
        const existingLedgerReference = await tx.ledgerTransaction.findFirst({
          where: {
            tenantId: bill.tenantId,
            reference: { equals: reference, mode: "insensitive" },
          },
          select: { id: true },
        })
        if (existingLedgerReference) {
          throw ExpectedQueryError.conflict(
            "This bank transfer reference already appears in the cooperative ledger."
          )
        }
        const claimed = await tx.platformBill.updateMany({
          where: { id: bill.id, status: "issued" },
          data: {
            status: "paid",
            paidAt,
            paymentReference: reference,
            paymentKey,
          },
        })
        if (!claimed.count)
          throw ExpectedQueryError.conflict(
            "Bill changed. Refresh and try again."
          )
        if (paystack)
          await tx.platformBillPaystackCheckout.update({
            where: { reference },
            data: { verifiedAt: now },
          })
        await tx.auditLog.create({
          data: {
            tenantId: bill.tenantId,
            actorType: paystack ? "system" : "user",
            actorUserId: "actorUserId" in source ? source.actorUserId : null,
            action: "platform_billing.payment_recorded",
            entityType: "PlatformBill",
            entityId: bill.id,
            metadata: {
              paidAt: input.paidAt,
              totalAmount: bill.totalAmount.toFixed(2),
              currencyCode: bill.currencyCode,
              fundingSourceType: bill.fundingSourceType,
              fundingSourceId: bill.fundingSourceId,
              fundingSourceName: bill.fundingSourceName,
              ...(paystack ? { provider: "paystack", reference } : {}),
            },
            occurredAt: now,
          },
        })
        return billSummary({
          ...bill,
          status: "paid",
          paidAt,
          paymentReference: reference,
        })
      },
      { isolationLevel: "Serializable" }
    )
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw ExpectedQueryError.conflict(
        "This bank transfer reference has already been used."
      )
    }
    throw error
  }
}

export async function reservePlatformBillPaystackCheckout(input: {
  tenantId: string
  billId: string
  mode: "test" | "live"
  replaceReference?: string
}) {
  const db = requireDb()
  return db.$transaction(async (tx) => {
    await lockCooperativeMobileBilling(tx, input.tenantId)
    const bill = await tx.platformBill.findFirst({
      where: {
        id: input.billId,
        tenantId: input.tenantId,
        tenant: financeReadyTenant,
        currencyCode,
        status: "issued",
      },
      select: { id: true, totalAmount: true, fundingSourceId: true },
    })
    if (!bill)
      throw ExpectedQueryError.precondition("This bill cannot be paid online.")
    if (!bill.fundingSourceId)
      throw ExpectedQueryError.precondition(
        "Choose where the money comes from before paying."
      )
    const amount = bill.totalAmount.times(100).toNumber()
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw ExpectedQueryError.validation("Invalid bill payment amount.")
    const latest = await tx.platformBillPaystackCheckout.findFirst({
      where: { invoiceId: bill.id, mode: input.mode },
      orderBy: [{ createdAt: "desc" }, { reference: "desc" }],
    })
    const checkout =
      latest && latest.reference !== input.replaceReference
        ? latest
        : await tx.platformBillPaystackCheckout.create({
            data: {
              invoiceId: bill.id,
              mode: input.mode,
              reference: `hv-invoice-${randomUUID()}`,
            },
          })
    return {
      reference: checkout.reference,
      authorizationUrl: checkout.authorizationUrl,
      amount,
    }
  })
}

export async function savePlatformBillPaystackAuthorization(
  reference: string,
  authorizationUrl: string
) {
  await requireDb().platformBillPaystackCheckout.update({
    where: { reference },
    data: { authorizationUrl },
  })
}

export async function findPlatformBillPaystackCheckout(
  input: {
    mode: "test" | "live"
  } & (
    | { reference: string; billId?: never; tenantId?: never }
    | { reference?: string; billId: string; tenantId: string }
  )
) {
  const checkout = await requireDb().platformBillPaystackCheckout.findFirst({
    where: {
      reference: input.reference,
      invoiceId: input.billId,
      mode: input.mode,
      invoice: { tenantId: input.tenantId, tenant: billableTenant },
    },
    orderBy: [{ createdAt: "desc" }, { reference: "desc" }],
    select: {
      reference: true,
      invoiceId: true,
      verifiedAt: true,
      invoice: { select: { tenantId: true } },
    },
  })
  return checkout
    ? {
        reference: checkout.reference,
        billId: checkout.invoiceId,
        verifiedAt: checkout.verifiedAt,
        tenantId: checkout.invoice.tenantId,
      }
    : null
}
