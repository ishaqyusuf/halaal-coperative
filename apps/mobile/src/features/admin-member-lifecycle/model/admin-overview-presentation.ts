import type { StatusTone } from "@/components/ui/status-pill"
import { formatMoney } from "@/lib/money"
import type { MobileReadCacheState } from "@/lib/read-cache"
import type { Href } from "expo-router"
import type { MobileAdminOverview } from "./admin-member-lifecycle-types"

/** Icon tile tints (02 Brand native tint pairs). */
export type AdminOverviewTint =
  | "danger"
  | "lilac"
  | "neutral"
  | "sky"
  | "success"
  | "vivid"
  | "warm"

type Severity = MobileAdminOverview["actionQueue"][number]["severity"]

export type AdminQueueRow = {
  count: number
  /** Where the row opens on mobile; null rows have no chevron. */
  destination: string | null
  href: Href | null
  icon: string
  key: string
  label: string
  severity: Severity
  severityLabel: string
  severityTone: StatusTone
  tint: AdminOverviewTint
}

export type AdminComplianceRow = {
  count: number
  href: Href | null
  icon: string
  key: string
  label: string
}

export type AdminActivityRow = {
  /** "₦25,000", or null for a request (the status pill shows instead). */
  amount: string | null
  id: string
  /** Contributions read as money in, repayments as money back. */
  amountTone: "in" | "repayment"
  label: string
  memberName: string | null
  /** "Aisha Bello · 1h ago", or the server detail for older payloads. */
  meta: string
  status: string | null
}

export type AdminOverviewFigure = {
  detail: string
  label: string
  /** 0–1 for a meter (collections). */
  ratio: number | null
  tone: "danger" | "default" | "ok" | "warm"
  value: string
  zero: boolean
}

export type AdminOverviewPresentation = {
  activity: AdminActivityRow[]
  collections: AdminOverviewFigure | null
  compliance: AdminComplianceRow[]
  decisions: { total: number; urgent: number }
  deployable: AdminOverviewFigure | null
  open: AdminQueueRow[]
  openTotal: number
  risk: AdminOverviewFigure | null
  urgent: AdminQueueRow[]
  urgentTotal: number
  warnings: MobileAdminOverview["warnings"]
}

const MEMBERS_TAB: Href = "/(admin)/(tabs)/members"
const FINANCE_TAB: Href = "/(admin)/(tabs)/finance"

/** Mobile screen each queue key opens (workshop 05, direction 02). */
const queueTargets: Record<
  string,
  { destination: string; href: Href } | undefined
> = {
  "disbursement-holds": { destination: "Financing operations", href: "/financing-operations" },
  "financing-approvals": { destination: "Financing operations", href: "/financing-operations" },
  "financing-cycle-warnings": { destination: "Financing operations", href: "/financing-operations" },
  "food-purchase-accounting": { destination: "Foodstuff operations", href: "/food-purchase-operations" },
  "food-purchase-applications": { destination: "Foodstuff operations", href: "/food-purchase-operations" },
  "kyc-documents": { destination: "Members", href: MEMBERS_TAB },
  "membership-approvals": { destination: "Members", href: MEMBERS_TAB },
  "opening-balances": { destination: "Members", href: MEMBERS_TAB },
  "overdue-follow-ups": { destination: "Repayment operations", href: "/repayment-operations" },
  "payment-receipts": { destination: "Finance", href: FINANCE_TAB },
  "procurement-requests": { destination: "Procurement operations", href: "/procurement-operations" },
  "profit-review": { destination: "Shares & profit", href: "/share-profit-governance" },
  "project-financing-requests": { destination: "Project financing operations", href: "/project-financing-operations" },
  "share-applications": { destination: "Shares & profit", href: "/share-profit-governance" },
  "support-cases": { destination: "Finance", href: FINANCE_TAB },
}

const queueLooks: Record<string, { icon: string; tint: AdminOverviewTint }> = {
  "disbursement-holds": { icon: "CirclePause", tint: "sky" },
  "failed-imports": { icon: "FileX", tint: "danger" },
  "financing-approvals": { icon: "HandCoins", tint: "sky" },
  "financing-cycle-warnings": { icon: "TriangleAlert", tint: "warm" },
  "food-purchase-accounting": { icon: "ShoppingBasket", tint: "vivid" },
  "food-purchase-applications": { icon: "ShoppingBasket", tint: "vivid" },
  "kyc-documents": { icon: "IdCard", tint: "success" },
  "membership-approvals": { icon: "UserRoundPlus", tint: "success" },
  "opening-balances": { icon: "Scale", tint: "lilac" },
  "overdue-follow-ups": { icon: "CalendarClock", tint: "vivid" },
  "payment-receipts": { icon: "Receipt", tint: "lilac" },
  "procurement-requests": { icon: "PackageSearch", tint: "sky" },
  "profit-review": { icon: "PieChart", tint: "lilac" },
  "project-financing-requests": { icon: "BriefcaseBusiness", tint: "success" },
  "setup-warnings": { icon: "Wrench", tint: "neutral" },
  "share-applications": { icon: "PieChart", tint: "lilac" },
  "support-cases": { icon: "Headphones", tint: "warm" },
}

const severityLooks: Record<Severity, { label: string; tone: StatusTone }> = {
  critical: { label: "Urgent", tone: "danger" },
  neutral: { label: "Info", tone: "info" },
  warning: { label: "Review", tone: "warning" },
}

const complianceTargets: Record<string, { href: Href | null; icon: string }> = {
  "document-review": { href: MEMBERS_TAB, icon: "FileText" },
  "kyc-incomplete": { href: MEMBERS_TAB, icon: "IdCard" },
  "profit-review": { href: "/share-profit-governance", icon: "PieChart" },
}

function toQueueRow(item: MobileAdminOverview["actionQueue"][number]): AdminQueueRow {
  const target = queueTargets[item.key]
  const look = queueLooks[item.key] ?? { icon: "ClipboardList", tint: "neutral" }
  const severity = severityLooks[item.severity] ?? severityLooks.neutral
  return {
    count: item.count,
    destination: target?.destination ?? null,
    href: target?.href ?? null,
    icon: look.icon,
    key: item.key,
    label: item.label,
    severity: item.severity,
    severityLabel: severity.label,
    severityTone: severity.tone,
    tint: look.tint,
  }
}

/** "4.2%" from a 0–1 ratio (one decimal, none when whole). */
export function formatRatioPercent(ratio: number) {
  const percent = Math.round(Math.max(0, ratio) * 1000) / 10
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1)}%`
}

/** Portfolio risk colour: none at 0%, warm up to 5%, danger above. */
export function portfolioRiskTone(ratio: number): AdminOverviewFigure["tone"] {
  if (ratio <= 0) return "ok"
  return ratio <= 0.05 ? "warm" : "danger"
}

/** "Just now", "12m ago", "3h ago", "Yesterday", then "14 Nov". */
export function formatActivityTime(occurredAt: string, now = new Date()) {
  const date = new Date(occurredAt)
  if (Number.isNaN(date.getTime())) return ""
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  if (date >= startOfToday) return `${Math.floor(minutes / 60)}h ago`
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  if (date >= startOfYesterday) return "Yesterday"
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const label = `${date.getDate()} ${months[date.getMonth()]}`
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`
}

function humanizeStatus(status: string) {
  const words = status.replace(/_/g, " ").trim()
  return words ? words[0]!.toUpperCase() + words.slice(1) : ""
}

function toActivityRow(
  item: MobileAdminOverview["recentActivity"][number],
  currencyCode: string,
  now: Date
): AdminActivityRow {
  const when = formatActivityTime(item.occurredAt, now)
  const memberName = item.memberName?.trim() || null
  const amount =
    typeof item.amount === "number" && Number.isFinite(item.amount)
      ? formatMoney(item.amount, {
          currencyCode,
          fractionDigits: Number.isInteger(item.amount) ? 0 : 2,
        })
      : null
  return {
    amount,
    amountTone: item.kind === "repayment" ? "repayment" : "in",
    id: item.id,
    label: item.label,
    memberName,
    // Older servers (before T05) send only the detail sentence.
    meta: memberName
      ? [memberName, when].filter(Boolean).join(" · ")
      : [item.detail, when].filter(Boolean).join(" · "),
    status: !amount && item.status ? humanizeStatus(item.status) : null,
  }
}

function sum(rows: AdminQueueRow[]) {
  return rows.reduce((total, row) => total + row.count, 0)
}

export function buildAdminOverviewPresentation(
  overview: MobileAdminOverview,
  currencyCode: string,
  now = new Date()
): AdminOverviewPresentation {
  const rows = overview.actionQueue.filter((item) => item.count > 0).map(toQueueRow)
  const urgent = rows.filter((row) => row.severity === "critical")
  const open = rows.filter((row) => row.severity !== "critical")
  const stat = (key: string) =>
    overview.stats.find((metric) => metric.key === key) ?? null
  const deployable = stat("deployable-funds")
  const collections = stat("collection-coverage")
  const risk = stat("portfolio-risk")

  return {
    activity: overview.recentActivity.map((item) =>
      toActivityRow(item, currencyCode, now)
    ),
    collections: collections
      ? {
          detail: collections.detail,
          label: collections.label,
          ratio: Math.min(1, Math.max(0, collections.value)),
          tone: "default",
          value: formatRatioPercent(collections.value),
          zero: collections.value <= 0,
        }
      : null,
    compliance: overview.complianceWatch.map((item) => ({
      count: item.count,
      href: item.count > 0 ? (complianceTargets[item.key]?.href ?? null) : null,
      icon: complianceTargets[item.key]?.icon ?? "ShieldCheck",
      key: item.key,
      label: item.label,
    })),
    decisions: { total: sum(rows), urgent: sum(urgent) },
    deployable: deployable
      ? {
          detail: deployable.detail,
          label: deployable.label,
          ratio: null,
          tone: "default",
          value: formatMoney(deployable.value, { currencyCode }),
          zero: deployable.value <= 0,
        }
      : null,
    open,
    openTotal: sum(open),
    risk: risk
      ? {
          detail: risk.detail,
          label: risk.label,
          ratio: null,
          tone: portfolioRiskTone(risk.value),
          value: formatRatioPercent(risk.value),
          zero: risk.value <= 0,
        }
      : null,
    urgent,
    urgentTotal: sum(urgent),
    warnings: overview.warnings,
  }
}

export type AdminOverviewBanner =
  | { kind: "offline"; cachedAt: string | null }
  | { kind: "stale"; cachedAt: string }
  | { kind: "error" }

export type AdminOverviewView = {
  banner: AdminOverviewBanner | null
  body: "content" | "denied" | "error" | "skeleton"
}

/**
 * One rule for every overview state (same as member home): data always wins
 * over a spinner, and a failed refresh keeps the content under a banner.
 */
export function resolveAdminOverviewView(input: {
  cache: MobileReadCacheState | null | undefined
  canUse: boolean
  hasData: boolean
  isError: boolean
  isOffline: boolean
  isPending: boolean
}): AdminOverviewView {
  if (!input.canUse) return { banner: null, body: "denied" }
  if (!input.hasData) {
    if (input.isPending) return { banner: null, body: "skeleton" }
    return {
      banner: input.isOffline ? { cachedAt: null, kind: "offline" } : null,
      body: "error",
    }
  }
  const cachedAt = input.cache?.status === "stale" ? input.cache.cachedAt : null
  if (input.isOffline) return { banner: { cachedAt, kind: "offline" }, body: "content" }
  if (cachedAt) return { banner: { cachedAt, kind: "stale" }, body: "content" }
  if (input.isError) return { banner: { kind: "error" }, body: "content" }
  return { banner: null, body: "content" }
}
