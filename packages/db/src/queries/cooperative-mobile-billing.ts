import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import {
  ExpectedQueryError,
  isUniqueConstraintError,
  QueryInfrastructureError,
} from "../query-error"
import { assessCooperativeMobileAccessCharge } from "./charges"
import {
  mobileAccessExpenseAccountCode,
  mobileAccessPayableAccountCode,
} from "./cooperative-mobile-billing-constants"
import { lockCooperativeMobileBilling } from "./cooperative-mobile-billing-lock"
import {
  getLedgerAccountByCode,
  paymentReferenceIdempotencyKey,
  postLedgerTransaction,
} from "./ledger"
import { getTenantInitialMigrationState } from "./migration"

const currencyCode = "NGN"
const billingTimeZone = "Africa/Lagos"
const workLimit = 50
const statementLimit = 100
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
const financeReadyTenant = {
  ...billableTenant,
  initialMigrationStatus: { in: ["finalized", "live_operations"] },
} satisfies Prisma.TenantWhereInput

const invoiceListSelect = {
  id: true,
  period: true,
  totalAmount: true,
  currencyCode: true,
  status: true,
  issuedAt: true,
  dueAt: true,
  paidAt: true,
  paymentReference: true,
  accrualPostedAt: true,
  remittancePostedAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.CooperativeMobileInvoiceSelect

type InvoiceListRow = Prisma.CooperativeMobileInvoiceGetPayload<{
  select: typeof invoiceListSelect
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

function invoiceSummary(invoice: InvoiceListRow) {
  return {
    id: invoice.id,
    period: invoice.period,
    totalAmount: Number(invoice.totalAmount),
    currencyCode: invoice.currencyCode,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    paidAt: invoice.paidAt,
    paymentReference: invoice.paymentReference,
    accrualPostedAt: invoice.accrualPostedAt,
    remittancePostedAt: invoice.remittancePostedAt,
    itemCount: invoice._count.items,
  }
}

export async function getMobileBillingCommitmentAmount(
  tenantId: string,
  db: Prisma.TransactionClient
) {
  if (
    typeof db.cooperativeMobileInvoice?.aggregate !== "function" ||
    typeof db.cooperativeMobileInvoiceItem?.aggregate !== "function"
  ) {
    return 0
  }

  const invoice = { tenantId, tenant: billableTenant }
  const [invoiced, recovered] = await Promise.all([
    db.cooperativeMobileInvoice.aggregate({
      where: invoice,
      _sum: { totalAmount: true },
    }),
    db.cooperativeMobileInvoiceItem.aggregate({
      where: {
        invoice,
        chargeApplication: {
          tenantId,
          status: "posted",
          ledgerTransaction: { isNot: null },
        },
      },
      _sum: { amount: true },
    }),
  ])

  // Deployable funds start from contributions, so neither the outgoing
  // remittance nor the member reimbursements are already included.
  const net = invoiced._sum.totalAmount?.minus(recovered._sum.amount ?? 0)
  return Math.max(0, Number(net ?? 0))
}

function eligibleTerms(tenantId: string, chargeDueAt: Date) {
  return {
    tenantId,
    chargeDueAt,
    currencyCode,
    approvedAt: { not: null },
    tenant: billableTenant,
  } satisfies Prisma.CooperativeMobileAccessTermWhereInput
}

async function issueMonthlyInvoice(
  input: { tenantId: string; chargeDueAt: Date; now: Date },
  db: PrismaClient
) {
  const period = input.chargeDueAt.toISOString().slice(0, 7)
  return db.$transaction(
    async (tx) => {
      await lockCooperativeMobileBilling(tx, input.tenantId)
      const where = eligibleTerms(input.tenantId, input.chargeDueAt)
      const unbilledTerms = await tx.cooperativeMobileAccessTerm.findMany({
        where: { ...where, billingItem: null },
        select: { id: true, amount: true },
      })
      if (!unbilledTerms.length) return false

      const existing = await tx.cooperativeMobileInvoice.findUnique({
        where: { tenantId_period: { tenantId: input.tenantId, period } },
        select: { id: true },
      })
      if (existing) {
        throw new QueryInfrastructureError(
          "Approved mobile access terms arrived after their invoice was issued."
        )
      }

      const totalAmount = unbilledTerms
        .slice(1)
        .reduce((sum, term) => sum.plus(term.amount), unbilledTerms[0]!.amount)
      const invoice = await tx.cooperativeMobileInvoice.create({
        data: {
          tenantId: input.tenantId,
          period,
          currencyCode,
          totalAmount,
          issuedAt: input.now,
          dueAt: databaseDate(localDay(input.now)),
          items: {
            createMany: {
              data: unbilledTerms.map((term) => ({
                termId: term.id,
                amount: term.amount,
                chargeDueAt: input.chargeDueAt,
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
          action: "mobile_billing.invoice_issued",
          entityType: "CooperativeMobileInvoice",
          entityId: invoice.id,
          metadata: {
            period,
            currencyCode,
            totalAmount: totalAmount.toFixed(2),
            itemCount: unbilledTerms.length,
          },
          occurredAt: input.now,
        },
      })
      return true
    },
    { isolationLevel: "ReadCommitted" }
  )
}

async function ensureMobileBillingAccounts(
  tenantId: string,
  tx: Prisma.TransactionClient
) {
  const [expense, payable] = await Promise.all([
    tx.ledgerAccount.upsert({
      where: {
        tenantId_code: { tenantId, code: mobileAccessExpenseAccountCode },
      },
      create: {
        tenantId,
        code: mobileAccessExpenseAccountCode,
        name: "Mobile app access cost",
        accountType: "expense",
        isSystem: true,
      },
      update: {},
    }),
    tx.ledgerAccount.upsert({
      where: {
        tenantId_code: { tenantId, code: mobileAccessPayableAccountCode },
      },
      create: {
        tenantId,
        code: mobileAccessPayableAccountCode,
        name: "Mobile app access payable",
        accountType: "liability",
        isSystem: true,
      },
      update: {},
    }),
  ])
  if (
    !expense.isSystem ||
    expense.accountType !== "expense" ||
    !payable.isSystem ||
    payable.accountType !== "liability"
  ) {
    throw new QueryInfrastructureError(
      "Mobile billing ledger accounts are unavailable."
    )
  }
  return { expense, payable }
}

async function applyMemberAssessment(itemId: string, db: PrismaClient) {
  return db.$transaction(
    async (tx) => {
      const item = await tx.cooperativeMobileInvoiceItem.findFirst({
        where: {
          id: itemId,
          chargeApplicationId: null,
          term: { tenant: financeReadyTenant },
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
      const migration = await getTenantInitialMigrationState(
        item.term.tenantId,
        txDb
      )
      if (!migration.snapshot.canUseLiveFinancialWrites) return false
      await ensureMobileBillingAccounts(item.term.tenantId, tx)
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

async function postInvoiceAccounting(
  invoiceId: string,
  db: PrismaClient,
  now: Date
) {
  return db.$transaction(
    async (tx) => {
      const invoice = await tx.cooperativeMobileInvoice.findFirst({
        where: { id: invoiceId, tenant: financeReadyTenant },
      })
      if (!invoice) return false
      const needsAccrual = !invoice.accrualPostedAt
      const needsRemittance =
        invoice.paidAt !== null && !invoice.remittancePostedAt
      if (!needsAccrual && !needsRemittance) return false

      const txDb = tx as PrismaClient
      const migration = await getTenantInitialMigrationState(
        invoice.tenantId,
        txDb
      )
      if (!migration.snapshot.canUseLiveFinancialWrites) return false
      const { expense, payable } = await ensureMobileBillingAccounts(
        invoice.tenantId,
        tx
      )
      const amount = Number(invoice.totalAmount)

      if (needsAccrual) {
        await postLedgerTransaction(
          {
            tenantId: invoice.tenantId,
            transactionType: "adjustment",
            postedAt: invoice.issuedAt,
            narration: `Mobile app access invoice for ${invoice.period}`,
            idempotencyKey: `mobile-app-invoice:${invoice.id}`,
            migrationWriteGuardValidated: true,
            entries: [
              { ledgerAccountId: expense.id, direction: "debit", amount },
              { ledgerAccountId: payable.id, direction: "credit", amount },
            ],
          },
          txDb
        )
      }

      if (needsRemittance) {
        if (!invoice.paidAt || !invoice.paymentReference) {
          throw new QueryInfrastructureError(
            "Mobile invoice is missing remittance evidence."
          )
        }
        const cash = await getLedgerAccountByCode(
          invoice.tenantId,
          "2000",
          txDb
        )
        if (!cash)
          throw new QueryInfrastructureError(
            "Cooperative cash ledger account is unavailable."
          )
        await postLedgerTransaction(
          {
            tenantId: invoice.tenantId,
            transactionType: "adjustment",
            postedAt: invoice.paidAt,
            reference: invoice.paymentReference,
            narration: `Mobile app access remittance for ${invoice.period}`,
            idempotencyKey: paymentReferenceIdempotencyKey(
              invoice.paymentReference
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

      await tx.cooperativeMobileInvoice.update({
        where: { id: invoice.id },
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

export async function processCooperativeMobileBilling(
  now = new Date(),
  override?: PrismaClient
) {
  const db = requireDb(override)
  const firstOfMonth = databaseDate(`${localDay(now).slice(0, 7)}-01`)
  const result = {
    invoices: 0,
    memberAssessments: 0,
    ledgerPostings: 0,
    failures: [] as Array<{
      operation: "invoice" | "assessment" | "accounting"
      id: string
    }>,
  }
  const dueGroups = await db.cooperativeMobileAccessTerm.groupBy({
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
  })
  for (const group of dueGroups) {
    if (!group.chargeDueAt) continue
    try {
      if (
        await issueMonthlyInvoice(
          { tenantId: group.tenantId, chargeDueAt: group.chargeDueAt, now },
          db
        )
      )
        result.invoices++
    } catch {
      result.failures.push({ operation: "invoice", id: group.tenantId })
    }
  }

  const pendingAccounting = await db.cooperativeMobileInvoice.findMany({
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
  })
  for (const invoice of pendingAccounting) {
    try {
      if (await postInvoiceAccounting(invoice.id, db, now))
        result.ledgerPostings++
    } catch {
      result.failures.push({ operation: "accounting", id: invoice.id })
    }
  }

  const pendingAssessments = await db.cooperativeMobileInvoiceItem.findMany({
    where: { chargeApplicationId: null, term: { tenant: financeReadyTenant } },
    orderBy: [{ chargeDueAt: "asc" }, { id: "asc" }],
    take: workLimit,
    select: { id: true },
  })
  for (const item of pendingAssessments) {
    try {
      if (await applyMemberAssessment(item.id, db)) result.memberAssessments++
    } catch {
      result.failures.push({ operation: "assessment", id: item.id })
    }
  }
  return result
}

export async function listCooperativeMobileInvoices(
  tenantId: string,
  override?: PrismaClient
) {
  const invoices = await requireDb(override).cooperativeMobileInvoice.findMany({
    where: { tenantId, tenant: billableTenant },
    select: invoiceListSelect,
    orderBy: { period: "desc" },
    take: statementLimit,
  })
  return invoices.map(invoiceSummary)
}

export async function getCooperativeMobileInvoice(
  input: { tenantId: string; invoiceId: string },
  override?: PrismaClient
) {
  const invoice = await requireDb(override).cooperativeMobileInvoice.findFirst({
    where: {
      id: input.invoiceId,
      tenantId: input.tenantId,
      tenant: billableTenant,
    },
    select: {
      ...invoiceListSelect,
      items: {
        orderBy: [{ chargeDueAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          chargeDueAt: true,
          amount: true,
          chargeApplicationId: true,
          term: { select: { member: { select: { fullName: true } } } },
        },
      },
    },
  })
  if (!invoice)
    throw ExpectedQueryError.notFound("Mobile access invoice not found.")
  const { items, ...summary } = invoice
  return {
    ...invoiceSummary(summary),
    items: items.map((item) => ({
      id: item.id,
      memberName: item.term.member.fullName,
      chargeDueAt: item.chargeDueAt,
      amount: Number(item.amount),
      chargeAssessed: item.chargeApplicationId !== null,
    })),
  }
}

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

export async function listCooperativeMobileReceivables(
  actorUserId: string,
  override?: PrismaClient
) {
  const db = requireDb(override)
  await requireBillingOperator(db, actorUserId)
  const invoices = await db.cooperativeMobileInvoice.findMany({
    where: { tenant: billableTenant },
    select: {
      ...invoiceListSelect,
      tenantId: true,
      tenant: { select: { name: true, dataClassification: true } },
    },
    orderBy: [{ status: "asc" }, { period: "desc" }, { id: "asc" }],
    take: statementLimit,
  })
  return invoices.map(({ tenant, tenantId, ...invoice }) => ({
    ...invoiceSummary(invoice),
    tenantId,
    tenantName: tenant.name,
    tenantClassification: tenant.dataClassification,
  }))
}

export async function recordCooperativeMobileRemittance(
  input: {
    actorUserId: string
    invoiceId: string
    reference: string
    paidAt: string
  },
  override?: PrismaClient
) {
  const db = requireDb(override)
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
        await requireBillingOperator(tx, input.actorUserId)
        const invoice = await tx.cooperativeMobileInvoice.findFirst({
          where: { id: input.invoiceId, tenant: billableTenant },
          select: { ...invoiceListSelect, tenantId: true, paymentKey: true },
        })
        if (!invoice)
          throw ExpectedQueryError.notFound("Mobile access invoice not found.")
        if (input.paidAt < localDay(invoice.issuedAt)) {
          throw ExpectedQueryError.validation(
            "Payment date cannot precede the invoice."
          )
        }
        if (invoice.status === "paid") {
          if (
            invoice.paymentKey === paymentKey &&
            invoice.paidAt?.valueOf() === paidAt.valueOf()
          ) {
            return invoiceSummary(invoice)
          }
          throw ExpectedQueryError.conflict(
            "This invoice already has a recorded remittance."
          )
        }
        const existingLedgerReference = await tx.ledgerTransaction.findFirst({
          where: {
            tenantId: invoice.tenantId,
            reference: { equals: reference, mode: "insensitive" },
          },
          select: { id: true },
        })
        if (existingLedgerReference) {
          throw ExpectedQueryError.conflict(
            "This bank transfer reference already appears in the cooperative ledger."
          )
        }
        const claimed = await tx.cooperativeMobileInvoice.updateMany({
          where: { id: invoice.id, status: "issued" },
          data: {
            status: "paid",
            paidAt,
            paymentReference: reference,
            paymentKey,
          },
        })
        if (!claimed.count)
          throw ExpectedQueryError.conflict(
            "Invoice changed. Refresh and try again."
          )
        await tx.auditLog.create({
          data: {
            tenantId: invoice.tenantId,
            actorType: "user",
            actorUserId: input.actorUserId,
            action: "mobile_billing.remittance_recorded",
            entityType: "CooperativeMobileInvoice",
            entityId: invoice.id,
            metadata: {
              paidAt: input.paidAt,
              totalAmount: invoice.totalAmount.toFixed(2),
              currencyCode: invoice.currencyCode,
            },
            occurredAt: now,
          },
        })
        return invoiceSummary({
          ...invoice,
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
