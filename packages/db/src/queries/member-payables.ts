import type { PrismaClient } from "../../generated/prisma/client"
import type { PaymentReceiptAllocationInput } from "./payment-receipts"

/**
 * Member payables and the cooperative's payment order (T30, 22 Nov 2026).
 *
 * A member's payment is applied in one order: overdue items first (oldest due
 * date), then procurement, foodstuff, loans, approved shares, commitment, and
 * anything left over goes to special savings. The mobile Record payment
 * preview and receipt approval both use `allocateReceiptAmount`, so what the
 * member saw is what staff approve (the preview is advisory: approval reads
 * the payables again at that moment).
 */

export type MemberPayableKind =
  | "procurement"
  | "food_purchase"
  | "loan"
  | "shares"
  | "commitment"

/** `overdue` is a group, not a kind: overdue items of any kind, oldest first. */
export type PaymentAllocationOrderKey = "overdue" | MemberPayableKind

export type PaymentAllocationMode = "automatic" | "member_choice"

export type PaymentAllocationSettings = {
  leftoverDestination: "special_savings"
  mode: PaymentAllocationMode
  order: PaymentAllocationOrderKey[]
}

export const DEFAULT_PAYMENT_ALLOCATION_ORDER: PaymentAllocationOrderKey[] = [
  "overdue",
  "procurement",
  "food_purchase",
  "loan",
  "shares",
  "commitment",
]

export const DEFAULT_PAYMENT_ALLOCATION_SETTINGS: PaymentAllocationSettings = {
  leftoverDestination: "special_savings",
  mode: "automatic",
  order: DEFAULT_PAYMENT_ALLOCATION_ORDER,
}

export type MemberPayable = {
  amount: number
  /** ISO date (yyyy-mm-dd) or null when the item has no due date. */
  dueDate: string | null
  /** `<kind>:<targetId>`, the id the pay-from-request deep link sends. */
  id: string
  kind: MemberPayableKind
  overdue: boolean
  /** Shown under the badge ("Laptop · instalment 3 of 6"). */
  subtitle: string | null
  targetId: string
  title: string
}

export type MemberPayablesSnapshot = {
  mode: PaymentAllocationMode
  payables: MemberPayable[]
}

const orderKeys = new Set<PaymentAllocationOrderKey>(
  DEFAULT_PAYMENT_ALLOCATION_ORDER
)

/**
 * Saved order with unknown keys dropped and missing keys appended in the
 * default order, so a partial or stale setting still covers every kind.
 */
export function normalizePaymentAllocationOrder(
  saved: readonly string[] | null | undefined
): PaymentAllocationOrderKey[] {
  const picked: PaymentAllocationOrderKey[] = []
  for (const key of saved ?? []) {
    if (
      orderKeys.has(key as PaymentAllocationOrderKey) &&
      !picked.includes(key as PaymentAllocationOrderKey)
    ) {
      picked.push(key as PaymentAllocationOrderKey)
    }
  }
  for (const key of DEFAULT_PAYMENT_ALLOCATION_ORDER) {
    if (!picked.includes(key)) picked.push(key)
  }
  return picked
}

export function resolvePaymentAllocationSettings(
  policy:
    | {
        paymentAllocationLeftover?: string | null
        paymentAllocationMode?: string | null
        paymentAllocationOrder?: readonly string[] | null
      }
    | null
    | undefined
): PaymentAllocationSettings {
  return {
    leftoverDestination: "special_savings",
    mode:
      policy?.paymentAllocationMode === "member_choice"
        ? "member_choice"
        : "automatic",
    order: normalizePaymentAllocationOrder(policy?.paymentAllocationOrder),
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

/** Payables in the cooperative's order. Stable for equal keys. */
export function orderMemberPayables(
  payables: readonly MemberPayable[],
  order: readonly PaymentAllocationOrderKey[] = DEFAULT_PAYMENT_ALLOCATION_ORDER
): MemberPayable[] {
  const normalized = normalizePaymentAllocationOrder(order)
  const overdueFirst = normalized.indexOf("overdue")
  const rank = (payable: MemberPayable) =>
    payable.overdue && overdueFirst >= 0
      ? overdueFirst
      : normalized.indexOf(payable.kind)
  return payables
    .map((payable, index) => ({ index, payable }))
    .sort((left, right) => {
      const byRank = rank(left.payable) - rank(right.payable)
      if (byRank) return byRank
      const leftDue = left.payable.dueDate ?? "9999-12-31"
      const rightDue = right.payable.dueDate ?? "9999-12-31"
      if (leftDue !== rightDue) return leftDue < rightDue ? -1 : 1
      return left.index - right.index
    })
    .map(({ payable }) => payable)
}

export type PayableAllocationLine = {
  amount: number
  /** The payable this line pays, or null for the leftover line. */
  payable: MemberPayable | null
}

/**
 * Spreads `totalAmount` over already-ordered payables: each takes up to its
 * amount (a short payment part-pays the first unpaid one), and anything left
 * goes to the leftover destination.
 */
export function spreadPaymentOverPayables(
  totalAmount: number,
  orderedPayables: readonly MemberPayable[]
): PayableAllocationLine[] {
  let left = roundMoney(totalAmount)
  const lines: PayableAllocationLine[] = []
  for (const payable of orderedPayables) {
    if (left <= 0) break
    if (payable.amount <= 0) continue
    const amount = roundMoney(Math.min(left, payable.amount))
    lines.push({ amount, payable })
    left = roundMoney(left - amount)
  }
  if (left > 0) lines.push({ amount: left, payable: null })
  return lines
}

/** The receipt allocation a payable (or the leftover) becomes. */
export function payableAllocationInput(
  line: PayableAllocationLine,
  input: { periodStart: Date }
): PaymentReceiptAllocationInput {
  const { amount, payable } = line
  if (!payable) {
    return {
      amount,
      category: "special_savings",
      periodIntent: "current_period",
      targetPeriodStart: input.periodStart,
    }
  }
  switch (payable.kind) {
    case "procurement":
      return {
        amount,
        category: "procurement",
        procurementRepaymentScheduleItemId: payable.targetId,
      }
    case "food_purchase":
      return {
        amount,
        category: "food_purchase",
        foodPurchaseApplicationId: payable.targetId,
      }
    case "loan":
      return {
        amount,
        category: "loan_servicing",
        loanId: payable.targetId,
        periodIntent: "current_period",
        targetPeriodStart: input.periodStart,
      }
    case "shares":
      return {
        amount,
        category: "shares",
        memberShareApplicationId: payable.targetId,
        notes: payable.title,
      }
    case "commitment":
      return {
        amount,
        category: "commitment",
        contributionPlanId: payable.targetId,
        periodIntent: "current_period",
        targetPeriodStart: input.periodStart,
      }
  }
}

/**
 * The allocation engine: orders the payables by the tenant setting, spreads
 * the amount and returns receipt allocations that add up to `totalAmount`.
 */
export function allocateReceiptAmount(input: {
  now?: Date
  payables: readonly MemberPayable[]
  settings?: PaymentAllocationSettings
  totalAmount: number
}): PaymentReceiptAllocationInput[] {
  const settings = input.settings ?? DEFAULT_PAYMENT_ALLOCATION_SETTINGS
  const periodStart = monthStart(input.now ?? new Date())
  return spreadPaymentOverPayables(
    input.totalAmount,
    orderMemberPayables(input.payables, settings.order)
  ).map((line) => payableAllocationInput(line, { periodStart }))
}

function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addMonths(date: Date, months: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
  )
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function lastDayOfMonth(date: Date) {
  return new Date(addMonths(monthStart(date), 1).getTime() - 86_400_000)
}

const payableScheduleStatuses = [
  "due",
  "overdue",
  "partially_paid",
  "pending",
] as const

/** Bounds per source: one screen of badges, never a member's whole history. */
const PAYABLE_LIMITS = { food: 12, loanRows: 36, procurement: 36 }

export async function getTenantPaymentAllocationSettings(
  tenantId: string,
  prisma: PrismaClient
): Promise<PaymentAllocationSettings> {
  const policy = await prisma.tenantPolicy.findUnique({
    select: {
      paymentAllocationLeftover: true,
      paymentAllocationMode: true,
      paymentAllocationOrder: true,
    },
    where: { tenantId },
  })
  return resolvePaymentAllocationSettings(policy)
}

/**
 * One member's current payables, in the cooperative's order. Five bounded
 * reads run in parallel (procurement instalments, foodstuff, loan schedule
 * rows, approved unpaid share purchases, this month's commitment).
 *
 * - Procurement: every unpaid instalment due by the end of this month, plus
 *   each request's next unpaid instalment (so a Pay button on a later
 *   instalment still lands on a badge).
 * - Foodstuff: approved applications with an unpaid balance, due at the end
 *   of the payback period after the cycle month.
 * - Loans: one payable per loan, the unpaid schedule rows due by month end.
 * - Shares: approved share purchases not yet paid (`paidAmount`).
 * - Commitment: the active plan's amount less what was posted this month.
 */
export async function listMemberPayables(
  input: { memberId: string; now?: Date; tenantId: string },
  prisma: PrismaClient,
  settings?: PaymentAllocationSettings
): Promise<MemberPayable[]> {
  const now = input.now ?? new Date()
  const today = isoDate(now)
  const monthEnd = lastDayOfMonth(now)
  const thisMonth = monthStart(now)
  const scope = { memberId: input.memberId, tenantId: input.tenantId }

  const [procurement, food, loanRows, shares, plan, resolvedSettings] =
    await Promise.all([
      prisma.procurementRepaymentScheduleItem.findMany({
        orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
        select: {
          amount: true,
          dueDate: true,
          id: true,
          installmentNumber: true,
          paidAmount: true,
          procurementRequest: {
            select: {
              id: true,
              itemName: true,
              _count: { select: { repaymentScheduleItems: true } },
            },
          },
        },
        take: PAYABLE_LIMITS.procurement,
        where: {
          ...scope,
          amount: {
            gt: prisma.procurementRepaymentScheduleItem.fields.paidAmount,
          },
          procurementRequest: scope,
          status: { in: [...payableScheduleStatuses] },
        },
      }),
      prisma.foodPurchaseApplication.findMany({
        orderBy: { requestedAt: "asc" },
        select: {
          approvedAmount: true,
          approvedPaybackMonths: true,
          cycle: { select: { periodMonth: true } },
          id: true,
          itemDescription: true,
          paidAmount: true,
        },
        take: PAYABLE_LIMITS.food,
        where: {
          ...scope,
          approvedAmount: {
            gt: prisma.foodPurchaseApplication.fields.paidAmount,
          },
          status: "approved",
        },
      }),
      prisma.repaymentScheduleItem.findMany({
        orderBy: [{ dueAt: "asc" }, { installmentNumber: "asc" }],
        select: {
          amountPaid: true,
          dueAt: true,
          loan: {
            select: { id: true, loanProduct: { select: { name: true } } },
          },
          totalDue: true,
        },
        take: PAYABLE_LIMITS.loanRows,
        where: {
          dueAt: { lte: monthEnd },
          loan: {
            ...scope,
            status: { in: ["approved", "disbursed", "active"] },
          },
          status: { in: [...payableScheduleStatuses] },
          tenantId: input.tenantId,
          totalDue: { gt: prisma.repaymentScheduleItem.fields.amountPaid },
        },
      }),
      prisma.memberShareApplication.findMany({
        orderBy: { reviewedAt: "asc" },
        select: {
          approvedUnits: true,
          id: true,
          paidAmount: true,
          reviewedAt: true,
          unitAmountSnapshot: true,
        },
        take: 6,
        where: { ...scope, paymentDue: true, status: "approved" },
      }),
      prisma.contributionPlan.findFirst({
        orderBy: { startsAt: "desc" },
        select: {
          amount: true,
          contributions: {
            select: { committedAmount: true },
            where: {
              postedAt: { gte: thisMonth, lt: addMonths(thisMonth, 1) },
              status: "posted",
            },
          },
          id: true,
        },
        where: { ...scope, isActive: true },
      }),
      settings
        ? Promise.resolve(settings)
        : getTenantPaymentAllocationSettings(input.tenantId, prisma),
    ])

  const payables: MemberPayable[] = []

  const monthEndIso = isoDate(monthEnd)
  const seenRequests = new Set<string>()
  for (const item of procurement) {
    const requestId = item.procurementRequest.id
    const dueDate = isoDate(item.dueDate)
    const first = !seenRequests.has(requestId)
    seenRequests.add(requestId)
    if (dueDate > monthEndIso && !first) continue
    const amount = roundMoney(Number(item.amount) - Number(item.paidAmount))
    if (amount <= 0) continue
    const total = item.procurementRequest._count.repaymentScheduleItems
    payables.push({
      amount,
      dueDate,
      id: `procurement:${item.id}`,
      kind: "procurement",
      overdue: dueDate < today,
      subtitle: `Instalment ${item.installmentNumber} of ${total}`,
      targetId: item.id,
      title: item.procurementRequest.itemName,
    })
  }

  for (const application of food) {
    const amount = roundMoney(
      Number(application.approvedAmount ?? 0) - Number(application.paidAmount)
    )
    if (amount <= 0) continue
    const due = lastDayOfMonth(
      addMonths(
        application.cycle.periodMonth,
        Math.max(0, (application.approvedPaybackMonths ?? 1) - 1)
      )
    )
    const dueDate = isoDate(due)
    payables.push({
      amount,
      dueDate,
      id: `food_purchase:${application.id}`,
      kind: "food_purchase",
      overdue: dueDate < today,
      subtitle: application.itemDescription ?? null,
      targetId: application.id,
      title: `${application.cycle.periodMonth.toLocaleString("en-NG", {
        month: "long",
        timeZone: "UTC",
      })} basket`,
    })
  }

  const loans = new Map<
    string,
    { amount: number; dueDate: string; overdue: boolean; title: string }
  >()
  for (const row of loanRows) {
    const amount = Number(row.totalDue) - Number(row.amountPaid)
    if (amount <= 0) continue
    const dueDate = isoDate(row.dueAt)
    const existing = loans.get(row.loan.id)
    if (existing) {
      existing.amount = roundMoney(existing.amount + amount)
      existing.overdue ||= dueDate < today
    } else {
      loans.set(row.loan.id, {
        amount: roundMoney(amount),
        dueDate,
        overdue: dueDate < today,
        title: row.loan.loanProduct.name,
      })
    }
  }
  for (const [loanId, loan] of loans) {
    payables.push({
      amount: loan.amount,
      dueDate: loan.dueDate,
      id: `loan:${loanId}`,
      kind: "loan",
      overdue: loan.overdue,
      subtitle: loan.overdue ? "Repayment overdue" : "Repayment",
      targetId: loanId,
      title: loan.title,
    })
  }

  for (const application of shares) {
    const units = application.approvedUnits ?? 0
    const amount = roundMoney(
      units * Number(application.unitAmountSnapshot) -
        Number(application.paidAmount)
    )
    if (amount <= 0) continue
    payables.push({
      amount,
      dueDate: null,
      id: `shares:${application.id}`,
      kind: "shares",
      overdue: false,
      subtitle: application.reviewedAt
        ? `Approved ${application.reviewedAt.toLocaleString("en-NG", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          })}`
        : "Approved",
      targetId: application.id,
      title: `${units} share unit${units === 1 ? "" : "s"}`,
    })
  }

  if (plan) {
    const posted = plan.contributions.reduce(
      (sum, contribution) => sum + Number(contribution.committedAmount ?? 0),
      0
    )
    const amount = roundMoney(Number(plan.amount) - posted)
    if (amount > 0) {
      payables.push({
        amount,
        dueDate: monthEndIso,
        id: `commitment:${plan.id}`,
        kind: "commitment",
        overdue: false,
        subtitle: thisMonth.toLocaleString("en-NG", {
          month: "long",
          timeZone: "UTC",
        }),
        targetId: plan.id,
        title: "Monthly commitment",
      })
    }
  }

  return orderMemberPayables(payables, resolvedSettings.order)
}
