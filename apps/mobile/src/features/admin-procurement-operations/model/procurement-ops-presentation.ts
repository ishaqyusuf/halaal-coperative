import { formatMoney } from "@/lib/money"
import { shortDate } from "@/features/admin-service-operations/public/service-ops"
import type {
  OpsDetail,
  OpsLane,
  OpsRow,
} from "@/features/admin-service-operations/public/service-ops"
import type {
  ProcurementCapabilities,
  ProcurementLane,
  ProcurementOperation,
  ProcurementSummary,
} from "./admin-procurement-operations-types"

export function procurementLanes(
  summary: ProcurementSummary | undefined
): OpsLane<ProcurementLane>[] {
  const completed = summary
    ? Math.max(
        0,
        summary.totalRequests -
          summary.pendingRequests -
          summary.approvedRequests -
          summary.activeRequests
      )
    : undefined
  return [
    { count: summary?.pendingRequests, empty: "No requests waiting for review", label: "Review", value: "review" },
    { count: summary?.approvedRequests, empty: "Nothing waiting for purchase", label: "Activate", value: "activate" },
    { count: summary?.activeRequests, empty: "No active repayments", label: "Servicing", value: "servicing" },
    { count: completed, empty: "No closed requests yet", label: "Completed", value: "completed" },
  ]
}

function term(request: ProcurementOperation) {
  return request.approvedRepaymentMonths ?? request.requestedRepaymentMonths
}

export function procurementRow(
  request: ProcurementOperation,
  capabilities: ProcurementCapabilities | undefined
): OpsRow {
  const base = {
    id: request.id,
    subtitle: `${request.itemName} · ${term(request)} months`,
    title: request.member.fullName,
  }
  switch (request.lane) {
    case "review":
      return {
        ...base,
        actionLabel: capabilities?.review ? "Review" : undefined,
        amount: request.requestedCost,
        meta: shortDate(request.requestedAt),
        pill:
          request.status === "under_review"
            ? { label: "In review", tone: "info" }
            : { label: "New", tone: "warning" },
      }
    case "activate":
      return {
        ...base,
        actionLabel: capabilities?.activate ? "Record purchase" : undefined,
        amount: request.approvedCost ?? request.requestedCost,
        meta: request.vendorName ? "Purchase evidence needed" : "Vendor evidence needed",
        pill: { label: "Approved", tone: "brand" },
      }
    case "servicing":
      return {
        ...base,
        actionLabel:
          capabilities?.submitPayment && request.nextDue ? "Record payment" : undefined,
        amount: request.outstandingAmount,
        meta: request.nextDue ? `Next due ${shortDate(request.nextDue.dueDate)}` : undefined,
        metaTone: request.overdueCount ? "danger" : "muted",
        pill: request.overdueCount
          ? { label: `${request.overdueCount} overdue`, tone: "danger" }
          : { label: "On track", tone: "success" },
      }
    default:
      return {
        ...base,
        amount: request.approvedCost ?? request.requestedCost,
        meta: request.reviewedAt ? shortDate(request.reviewedAt) : undefined,
        pill:
          request.status === "rejected"
            ? { label: "Rejected", tone: "danger" }
            : request.status === "cancelled"
              ? { label: "Cancelled", tone: "neutral" }
              : { label: "Completed", tone: "neutral" },
      }
  }
}

export function procurementDetail(
  request: ProcurementOperation,
  currencyCode: string
): OpsDetail {
  const row = procurementRow(request, undefined)
  const money = (value: number) => formatMoney(value, { currencyCode })
  const stepIndex = { activate: 1, completed: 3, review: 0, servicing: 2 }[request.lane]
  const timeline: OpsDetail["timeline"] = [
    {
      meta: `${shortDate(request.requestedAt)} · ${request.member.fullName}`,
      note: request.itemDescription ?? undefined,
      title: "Submitted",
    },
  ]
  if (request.reviewedAt)
    timeline.push({
      meta: `${shortDate(request.reviewedAt)} · ${request.reviewedByUser?.fullName ?? "Finance"}`,
      note: request.reviewNotes ?? undefined,
      title: request.status === "rejected" ? "Rejected" : request.status === "under_review" ? "In review" : "Approved",
    })
  if (request.purchasedAt)
    timeline.push({
      meta: shortDate(request.purchasedAt),
      note: [request.purchaseReference, request.purchaseNotes].filter(Boolean).join(" · ") || undefined,
      title: "Purchase recorded",
    })
  const items = request.repaymentScheduleItems
  const next = items.findIndex((item) => item.outstandingAmount > 0)
  const window = items.slice(Math.max(0, next - 2), Math.max(0, next - 2) + 6)
  return {
    amount: row.amount,
    facts: [
      ["Member", `${request.member.fullName} · ${request.member.memberNumber}`],
      ["Requested", money(request.requestedCost)],
      ...(request.approvedCost === null ? [] : ([["Approved", money(request.approvedCost)]] as [string, string][])),
      ["Term", `${term(request)} months`],
      ["Vendor", request.vendorName ?? "Not recorded"],
      ...(request.lane === "servicing" ? ([["Outstanding", money(request.outstandingAmount)]] as [string, string][]) : []),
    ],
    headline: request.itemName,
    meta: row.meta,
    pill: row.pill,
    schedule: window.length
      ? {
          rows: window.map((item) => {
            const overdue = item.outstandingAmount > 0 && new Date(item.dueDate).getTime() < Date.now()
            const status =
              item.outstandingAmount <= 0 ? "Paid" : overdue ? "Overdue" : item.status === "partially_paid" ? "Part paid" : "Upcoming"
            return {
              amount: item.amount,
              sub: `${shortDate(item.dueDate)} · ${status}`,
              title: `Installment ${item.installmentNumber}`,
              tone: status === "Paid" ? "success" : status === "Overdue" ? "danger" : "muted",
            }
          }),
          side: `${items.length} installments`,
          title: "Repayment schedule",
        }
      : undefined,
    stepIndex,
    steps: ["Review", "Activate", "Servicing", "Completed"],
    timeline,
    who: `${request.member.fullName} · ${request.member.memberNumber}`,
  }
}

export function procurementSummaryHero(summary: ProcurementSummary | undefined) {
  return {
    caption: "Outstanding",
    needAction: summary
      ? summary.pendingRequests + summary.approvedRequests + summary.overdueScheduleItems
      : undefined,
    sub: summary
      ? `${summary.activeRequests} active · ${summary.dueScheduleItems} installments due`
      : undefined,
    value: summary?.outstandingAmount,
  }
}


