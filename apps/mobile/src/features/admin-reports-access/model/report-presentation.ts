import type { StatusTone } from "@/components/ui/status-pill"
import type { RowPosition } from "@/components/ui/list-card"
import type { GeneratedReportFile } from "./generated-report-file"
import type {
  AdminActivityArea,
  AdminActivityEvent,
  AdminReportActivityFilters,
  AdminReportCard,
  AdminReportFilters,
} from "./admin-reports-access-types"

/** Tinted tile tones, mapped to the 02 tint classes by the UI. */
export type TileTone =
  | "brand"
  | "danger"
  | "lilac"
  | "neutral"
  | "rose"
  | "sky"
  | "success"
  | "warm"

export const REPORT_CATEGORIES = [
  ["members", "Members"],
  ["finance", "Finance"],
  ["operations", "Operations"],
  ["governance", "Governance"],
] as const satisfies readonly [AdminReportCard["category"], string][]

const REPORT_LOOK: Record<string, [icon: string, tone: TileTone]> = {
  audit: ["History", "neutral"],
  charges: ["Receipt", "warm"],
  contributions: ["Coins", "brand"],
  financing: ["HandCoins", "sky"],
  foodPurchase: ["ShoppingBasket", "warm"],
  memberStatements: ["FileText", "brand"],
  members: ["UsersRound", "brand"],
  openingBalances: ["Layers", "neutral"],
  paymentReceipts: ["ReceiptText", "warm"],
  procurement: ["Package", "warm"],
  profit: ["Sparkles", "lilac"],
  projectFinancing: ["BriefcaseBusiness", "sky"],
  repayments: ["RotateCw", "sky"],
  shares: ["PieChart", "lilac"],
  specialSavings: ["Wallet", "brand"],
  support: ["MessagesSquare", "rose"],
}

export function reportLook(key: string) {
  const [icon, tone] = REPORT_LOOK[key] ?? ["FileText", "neutral" as TileTone]
  return { icon, tone }
}

/** Report cards in the approved order, grouped by category (empty groups dropped). */
export function groupReports(reports: readonly AdminReportCard[]) {
  return REPORT_CATEGORIES.map(([category, label]) => ({
    category,
    label,
    reports: reports.filter((report) => report.category === category),
  })).filter((group) => group.reports.length > 0)
}

export const FILE_LOOK: Record<
  GeneratedReportFile["status"],
  { icon: string; label: string; pill: StatusTone; tone: TileTone }
> = {
  cancelled: { icon: "Ban", label: "Cancelled", pill: "neutral", tone: "neutral" },
  expired: { icon: "Clock", label: "Expired", pill: "neutral", tone: "neutral" },
  failed: { icon: "FileX", label: "Failed", pill: "danger", tone: "danger" },
  pending: { icon: "LoaderCircle", label: "Generating", pill: "brand", tone: "brand" },
  ready: { icon: "FileCheck", label: "Ready", pill: "success", tone: "success" },
}

/** "14:32" left before a ready file is removed from the phone. */
export function countdownText(expiresAt: string | null, now = Date.now()) {
  if (!expiresAt) return "0:00"
  const seconds = Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

export function fileSubtitle(file: GeneratedReportFile, now = Date.now()) {
  if (file.status === "ready")
    return `${file.rowCount ?? 0} rows · ${countdownText(file.expiresAt, now)} left`
  if (file.status === "pending") return "Generating…"
  if (file.status === "expired") return "Expired · generate again"
  if (file.status === "failed") return "Couldn’t generate · retry"
  return "Cancelled"
}

function dateOnly(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export type QuickRange = "all" | "last" | "month" | "year"

export const QUICK_RANGES = [
  ["month", "This month"],
  ["last", "Last month"],
  ["year", "This year"],
  ["all", "All records"],
] as const satisfies readonly [QuickRange, string][]

/** Date-only (YYYY-MM-DD) bounds for a quick range, in the phone's time zone. */
export function quickRange(range: QuickRange, now = new Date()): AdminReportFilters {
  const year = now.getFullYear()
  const month = now.getMonth()
  if (range === "month")
    return { fromDate: dateOnly(new Date(year, month, 1)), toDate: dateOnly(now) }
  if (range === "last")
    return {
      fromDate: dateOnly(new Date(year, month - 1, 1)),
      toDate: dateOnly(new Date(year, month, 0)),
    }
  if (range === "year")
    return { fromDate: dateOnly(new Date(year, 0, 1)), toDate: dateOnly(now) }
  return { fromDate: null, toDate: null }
}

export function matchQuickRange(filters: AdminReportFilters, now = new Date()) {
  return (
    QUICK_RANGES.find(([range]) => {
      const bounds = quickRange(range, now)
      return bounds.fromDate === filters.fromDate && bounds.toDate === filters.toDate
    })?.[0] ?? null
  )
}

function formatDay(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year!, month! - 1, day!).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function rangeText(filters: AdminReportFilters) {
  if (!filters.fromDate && !filters.toDate) return "All records"
  return `${filters.fromDate ? formatDay(filters.fromDate) : "First record"} – ${filters.toDate ? formatDay(filters.toDate) : "Today"}`
}

/** Action chips: a substring of the audit action (server `contains`). */
export const ACTION_CHIPS = [
  [null, "All"],
  ["approved", "Approved"],
  ["created", "Created"],
  ["updated", "Updated"],
  ["report.generated", "Reports"],
] as const satisfies readonly [string | null, string][]

/** Record chips: an area of the cooperative. */
export const AREA_CHIPS = [
  [null, "All records"],
  ["members", "Members"],
  ["money", "Payments"],
  ["loans", "Financing"],
  ["shares", "Shares"],
  ["support", "Support"],
] as const satisfies readonly [AdminActivityArea | null, string][]

/** How many filters the header badge counts (search, action, record, dates). */
export function activeFilterCount(filters: AdminReportActivityFilters) {
  return [
    filters.search,
    filters.action,
    filters.area,
    filters.fromDate || filters.toDate,
  ].filter(Boolean).length
}

/** The activity dot colour, from the action's last word. */
export function actionTone(action: string): TileTone {
  const verb = action.split(".").at(-1) ?? ""
  if (action.includes("report.generated")) return "lilac"
  if (/approved|paid|published|completed|resolved|verified/.test(verb)) return "success"
  if (/revoked|rejected|failed|error|cancelled|deleted/.test(verb)) return "danger"
  if (/updated|reviewed|changed|set/.test(verb)) return "sky"
  if (/created|recorded|applied|submitted|posted|requested|granted|generated/.test(verb))
    return "brand"
  return "neutral"
}

export function actionIcon(action: string) {
  if (action.includes("report.generated")) return "FileText"
  if (/approved|published|verified/.test(action)) return "ShieldCheck"
  return "History"
}

const actorRoles: Record<string, string> = {
  integration: "Integration",
  system: "Automated",
  user: "Staff",
}

export function actorRole(event: Pick<AdminActivityEvent, "actorType">) {
  return actorRoles[event.actorType] ?? "Staff"
}

/** "Payment receipt · 3f2a91c0", the record line under an event. */
export function recordLine(event: AdminActivityEvent) {
  const label = event.entityLabel ?? event.entityType
  return event.entityId ? `${label} · ${event.entityId.slice(0, 8)}` : label
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** "Today", "Yesterday", "Sunday 15 Nov" this week, else "3 Oct 2026". */
export function dayLabel(iso: string, now = new Date()) {
  const date = new Date(iso)
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7)
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", weekday: "long" }).replace(",", "")
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })
}

export type ActivityListRow =
  | { count: number; key: string; kind: "day"; label: string }
  | { event: AdminActivityEvent; key: string; kind: "event"; position: RowPosition }

/** Day headers plus events, each day's events joined into one card. */
export function activityRows(events: readonly AdminActivityEvent[], now = new Date()) {
  const rows: ActivityListRow[] = []
  let group: { header: Extract<ActivityListRow, { kind: "day" }>; items: AdminActivityEvent[] } | null = null
  const flush = () => {
    if (!group) return
    group.header.count = group.items.length
    rows.push(group.header)
    group.items.forEach((event, index) =>
      rows.push({
        event,
        key: event.id,
        kind: "event",
        position:
          group!.items.length === 1
            ? "only"
            : index === 0
              ? "first"
              : index === group!.items.length - 1
                ? "last"
                : "middle",
      })
    )
  }
  for (const event of events) {
    const label = dayLabel(event.occurredAt, now)
    if (!group || group.header.label !== label) {
      flush()
      group = { header: { count: 0, key: `day-${label}`, kind: "day", label }, items: [] }
    }
    group.items.push(event)
  }
  flush()
  return rows
}
