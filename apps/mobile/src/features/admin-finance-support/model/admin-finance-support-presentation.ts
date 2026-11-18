import type { StatusTone } from "@/components/ui/status-pill"
import type {
  AdminFinanceSupportItem,
  AdminFinanceSupportQueueKey,
} from "./admin-finance-support-types"

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
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

export function formatAdminFinanceAge(minutes: number) {
  if (minutes < 60) return `${minutes}m waiting`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h waiting`
  return `${Math.floor(minutes / 1440)}d waiting`
}

export function matchesFinanceDeskSearch(
  item: AdminFinanceSupportItem,
  search: string
) {
  const term = search.trim().toLowerCase()
  return (
    !term ||
    [
      item.title,
      item.subtitle,
      item.member?.number,
      item.state,
      item.details.find((detail) => detail.label === "Vendor")?.value,
    ].some((value) => value?.toLowerCase().includes(term))
  )
}

export function financeDeskItemStatus(item: AdminFinanceSupportItem): {
  label: string
  tone: StatusTone
} {
  const state = item.displayState ?? item.state
  const label =
    state === "under_review" ? "In review" : formatAdminFinanceStatus(state)
  switch (state) {
    case "under_review":
      return { label, tone: "lilac" }
    case "due":
    case "pending":
      return { label, tone: "warning" }
    case "overdue":
      return { label, tone: "danger" }
    default:
      return { label, tone: "info" }
  }
}

export const financeDeskLaneNames: Record<AdminFinanceSupportQueueKey, string> =
  {
    receipts: "Receipt",
    financing: "Financing",
    procurement: "Procurement",
    foodPurchase: "Foodstuff",
    projectFinancing: "Project",
    shares: "Shares",
    collections: "Collection",
    support: "Support",
  }
