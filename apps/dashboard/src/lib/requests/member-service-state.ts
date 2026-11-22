import type {
  getMobileMemberFoodPurchaseService,
  getMobileMemberProcurementService,
} from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import {
  memberVerificationReason,
  nextUnpaidScheduleItem,
  type ServiceGate,
  type ServiceGatePayable,
  serviceRequestGate,
} from "@halaalvest/utils/service-request-gate"

type ProcurementService = Awaited<
  ReturnType<typeof getMobileMemberProcurementService>
>
type FoodPurchaseService = Awaited<
  ReturnType<typeof getMobileMemberFoodPurchaseService>
>

export type MemberActiveInstalment = {
  amount: number
  dueDate: string
  id: string
  number: number
  overdue: boolean
  paidAmount: number
  payable: ServiceGatePayable
  status: string
}

/** The member's current item with what is due next (T30 direction 01). */
export type MemberActiveItem = {
  /** Submitted payment still with finance (payments-core payables read). */
  checkingAmount?: number
  facts: { label: string; value: string }[]
  instalments: MemberActiveInstalment[]
  left: number
  next: {
    amount: number
    dueDate: string | null
    overdue: boolean
    payable: ServiceGatePayable
  } | null
  paid: number
  progressLabel: string
  title: string
  total: number
}

export type MemberServiceState = {
  active: MemberActiveItem | null
  gate: ServiceGate | null
}

/** Pay link for Record payment (T30 kit, dashboard contract). */
export function memberPayHref(payable: ServiceGatePayable) {
  return `/payment-receipts?paymentReceiptSheetType=member-create&payable=${encodeURIComponent(payable)}`
}

function isPastDue(dueDate: string, today: Date) {
  return new Date(dueDate).getTime() < today.getTime()
}

function startOfToday() {
  const today = new Date()
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )
}

function procurementActive(
  row: NonNullable<ProcurementService["activeRequest"]>
): MemberActiveItem {
  const today = startOfToday()
  const instalments = row.scheduleItems.map((item) => {
    const open =
      item.status !== "paid" &&
      item.status !== "waived" &&
      item.amount > item.paidAmount
    return {
      amount: item.amount,
      dueDate: item.dueDate,
      id: item.id,
      number: item.installmentNumber,
      overdue:
        open && (item.status === "overdue" || isPastDue(item.dueDate, today)),
      paidAmount: item.paidAmount,
      payable: `procurement:${item.id}` as const,
      status: item.status,
    }
  })
  const next = nextUnpaidScheduleItem(instalments)
  const total = instalments.reduce((sum, item) => sum + item.amount, 0)
  const paid = instalments.reduce((sum, item) => sum + item.paidAmount, 0)
  const paidCount = instalments.filter(
    (item) => item.status === "paid" || item.paidAmount >= item.amount
  ).length
  return {
    facts: [
      {
        label: "Item",
        value: row.vendorName
          ? `${row.itemName} · ${row.vendorName}`
          : row.itemName,
      },
    ],
    instalments,
    left: row.outstandingAmount ?? Math.max(total - paid, 0),
    next: next
      ? {
          amount: next.amount - next.paidAmount,
          dueDate: next.dueDate,
          overdue: next.overdue,
          payable: next.payable,
        }
      : null,
    paid,
    progressLabel: `${paidCount} of ${instalments.length} instalments paid`,
    title: row.itemName,
    total,
  }
}

export function procurementMemberState(
  service: ProcurementService
): MemberServiceState {
  const row = service.activeRequest
  const active = row ? procurementActive(row) : null
  const gate = serviceRequestGate({
    accessMode: service.capability.accessMode,
    active: active
      ? {
          outstanding: active.left,
          payable: active.next?.payable ?? null,
          title: active.title,
        }
      : null,
    canCreate: service.canCreateRequest,
    design: { noun: "request", title: "Procurement" },
    formatMoney: formatCurrency,
    kind: "procurement",
    reasons: service.restrictionReasons,
  })
  return { active, gate }
}

function foodPurchaseActive(
  row: NonNullable<FoodPurchaseService["activeRequest"]>
): MemberActiveItem {
  const total = row.approvedAmount ?? row.requestedAmount
  const left = Math.max(total - row.paidAmount, 0)
  const month = new Date(row.cycle.periodMonth).toLocaleDateString("en-GB", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  })
  return {
    facts: [
      { label: "Month", value: month },
      ...(row.approvedPaybackMonths
        ? [
            {
              label: "Pay back over",
              value: `${row.approvedPaybackMonths} months`,
            },
          ]
        : []),
    ],
    instalments: [],
    left,
    next:
      left > 0
        ? {
            amount: left,
            dueDate: null,
            overdue: false,
            payable: `food_purchase:${row.id}`,
          }
        : null,
    paid: row.paidAmount,
    progressLabel: `${Math.round((row.paidAmount / Math.max(total, 1)) * 100)}% paid`,
    title: `${month} foodstuff`,
    total,
  }
}

/**
 * Foodstuff reasons come from the server's availability check. Verification
 * is checked when an application is created, so a member who isn't ready
 * gets the server's verification reason here too.
 */
export function foodPurchaseMemberState(
  service: FoodPurchaseService,
  memberReady: boolean | null
): MemberServiceState {
  const row = service.activeRequest
  const active = row ? foodPurchaseActive(row) : null
  const needsVerification =
    service.capability.accessMode === "member_self_service" &&
    memberReady === false
  const gate = serviceRequestGate({
    accessMode: service.capability.accessMode,
    active: active
      ? {
          outstanding: active.left,
          payable: active.next?.payable ?? null,
          title: active.title,
        }
      : null,
    canCreate: service.canCreateApplication && !needsVerification,
    design: { noun: "application", title: "Foodstuff purchase" },
    formatMoney: formatCurrency,
    kind: "food-purchase",
    reasons: needsVerification
      ? [memberVerificationReason, ...service.restrictionReasons]
      : service.restrictionReasons,
  })
  return { active, gate }
}
