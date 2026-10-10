import type {
  AdminFinanceSupportOverview,
  AdminFinanceSupportQueueKey,
} from "./admin-finance-support-types"

export type AdminFinanceSupportPresentation = {
  blockedCount: number
  deployableFunds: number | null
  filteredCount: number
  totalCount: number
}

export const adminFinanceQueueFilters: readonly {
  label: string
  value: "all" | AdminFinanceSupportQueueKey
}[] = [
  { label: "All", value: "all" },
  { label: "Receipts", value: "receipts" },
  { label: "Financing", value: "financing" },
  { label: "Procurement", value: "procurement" },
  { label: "Food", value: "foodPurchase" },
  { label: "Projects", value: "projectFinancing" },
  { label: "Shares", value: "shares" },
  { label: "Collections", value: "collections" },
  { label: "Support", value: "support" },
]

export function formatAdminFinanceStatus(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function formatAdminFinanceCurrency(
  value: number,
  currencyCode: string
) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

export function formatAdminFinanceCompactCurrency(
  value: number,
  currencyCode: string
) {
  const divisor = Math.abs(value) >= 1_000_000 ? 1_000_000 : 1_000
  const suffix = divisor === 1_000_000 ? "m" : "k"

  if (Math.abs(value) >= 1_000) {
    return `${new Intl.NumberFormat("en-NG", {
      currency: currencyCode,
      maximumFractionDigits: 1,
      style: "currency",
    }).format(value / divisor)}${suffix}`
  }

  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 1,
    style: "currency",
  }).format(value)
}

export function formatAdminFinanceAge(minutes: number) {
  if (minutes < 60) return `${minutes}m waiting`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h waiting`
  return `${Math.floor(minutes / 1440)}d waiting`
}

export function getAdminFinanceQueueCount(
  overview: AdminFinanceSupportOverview | null,
  queueKey: "all" | AdminFinanceSupportQueueKey
) {
  if (!overview) return 0
  if (queueKey === "all") {
    return overview.queueCounts.reduce((total, queue) => total + queue.count, 0)
  }
  return (
    overview.queueCounts.find((queue) => queue.key === queueKey)?.count ?? 0
  )
}

export function buildAdminFinanceSupportPresentation(
  overview: AdminFinanceSupportOverview
): AdminFinanceSupportPresentation {
  const totalCountMetric = overview.stats.find(
    (metric) => metric.key === "visible-work"
  )
  const blockedMetric = overview.stats.find(
    (metric) => metric.key === "blocked-work"
  )
  const deployableFundsMetric = overview.stats.find(
    (metric) => metric.key === "deployable-funds"
  )

  return {
    blockedCount:
      blockedMetric?.value ??
      overview.items.filter((item) => item.blockers.length > 0).length,
    deployableFunds: deployableFundsMetric?.value ?? null,
    filteredCount: overview.items.length,
    totalCount:
      totalCountMetric?.value ??
      overview.queueCounts.reduce((total, queue) => total + queue.count, 0),
  }
}
