import type {
  MobileMemberProcurement,
  MobileMemberProcurementRequest,
} from "./member-procurement-types"

const openingBalanceReferencePrefix = "opening-balance:"

const activeProcurementStatuses = new Set([
  "approved",
  "partially_paid",
  "purchased",
])
const openScheduleStatuses = new Set(["due", "overdue", "partially_paid"])

export function formatProcurementCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

export function formatProcurementDate(value: string | null) {
  if (!value) return "Not recorded"

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

export function formatProcurementStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getActiveProcurementRequest(
  requests: MobileMemberProcurementRequest[]
) {
  return (
    requests.find(
      (request) =>
        request.outstandingAmount > 0 &&
        activeProcurementStatuses.has(request.status.toLowerCase())
    ) ?? requests.find((request) => request.outstandingAmount > 0)
  )
}

export function presentMemberProcurementOverview(
  procurement: MobileMemberProcurement,
  currencyCode: string
) {
  const activeRequest = getActiveProcurementRequest(procurement.requests)
  const total = activeRequest
    ? (activeRequest.approvedCost ?? activeRequest.requestedCost)
    : procurement.summary.outstandingAmount
  const outstanding = activeRequest?.outstandingAmount ?? 0
  const paid = Math.max(0, total - outstanding)
  const progressPercent = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  const openSchedule = activeRequest?.scheduleItems
    .filter((item) => openScheduleStatuses.has(item.status.toLowerCase()))
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
  const nextDue = openSchedule?.[0]
  const monthlyAmount =
    activeRequest?.approvedMonthlyRepayment ??
    activeRequest?.estimatedMonthlyRepayment ??
    0

  return {
    activeRequest,
    balance: formatProcurementCurrency(
      procurement.summary.outstandingAmount,
      currencyCode
    ),
    historyRequests: activeRequest
      ? procurement.requests.filter(
          (request) => request.id !== activeRequest.id
        )
      : procurement.requests,
    isOnTrack: procurement.summary.overdueScheduleItems === 0,
    monthlyAmount: formatProcurementCurrency(monthlyAmount, currencyCode),
    nextDueDate: nextDue ? formatProcurementDate(nextDue.dueDate) : null,
    openPaymentCount: openSchedule?.length ?? 0,
    paidAmount: formatProcurementCurrency(paid, currencyCode),
    progressPercent,
    purchaseValue: formatProcurementCurrency(total, currencyCode),
  }
}

export function presentMemberProcurementRequest(
  request: MobileMemberProcurementRequest,
  currencyCode: string
) {
  const dueCount = request.scheduleItems.filter((item) =>
    openScheduleStatuses.has(item.status.toLowerCase())
  ).length

  return {
    accessibilityLabel: `View ${request.itemName} procurement details, ${formatProcurementStatus(request.status)}`,
    amount: formatProcurementCurrency(request.requestedCost, currencyCode),
    date: formatProcurementDate(request.requestedAt),
    dueCount,
    status: formatProcurementStatus(request.status),
    title: request.itemName,
    term: `${request.requestedRepaymentMonths} months`,
  }
}

export function getVisibleProcurementPurchaseReference(value: string | null) {
  if (!value || value.startsWith(openingBalanceReferencePrefix)) return null

  return value
}

export function getProcurementPurchaseReferenceDetail(value: string | null) {
  if (value?.startsWith(openingBalanceReferencePrefix)) {
    return "Imported historical record"
  }

  return value ?? "No purchase reference"
}
