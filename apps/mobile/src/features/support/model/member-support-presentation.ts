import type { StatusTone } from "@/components/ui/status-pill"
import type {
  MobileSupportCase,
  MobileSupportCategory,
  MobileSupportMessage,
} from "./member-support-types"

export const supportCategories = {
  payment_issue: { label: "Payment", icon: "Banknote" },
  account_update: { label: "Account", icon: "UserRound" },
  shares: { label: "Shares", icon: "ChartPie" },
  financing: { label: "Financing", icon: "HandCoins" },
  procurement: { label: "Procurement", icon: "ShoppingCart" },
  feature_request: { label: "Feature request", icon: "Sparkles" },
  technical: { label: "Technical", icon: "Wrench" },
  other: { label: "Other", icon: "CircleHelp" },
} satisfies Record<MobileSupportCategory, { label: string; icon: string }>

const statuses: Record<
  string,
  { label: string; tone: StatusTone; dot: string }
> = {
  open: { label: "Open", tone: "info", dot: "bg-tint-sky-foreground" },
  in_progress: { label: "In progress", tone: "brand", dot: "bg-primary" },
  waiting_on_member: {
    label: "Waiting on you",
    tone: "warning",
    dot: "bg-brand-warm",
  },
  resolved: { label: "Resolved", tone: "success", dot: "bg-success" },
  closed: { label: "Closed", tone: "neutral", dot: "bg-muted-foreground" },
}

export function caseStatus(status: string) {
  return (
    statuses[status] ?? {
      label: formatSupportValue(status),
      tone: "neutral" as const,
      dot: "bg-muted-foreground",
    }
  )
}

export function formatSupportValue(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase())
}

export function isActiveCase(item: MobileSupportCase) {
  return item.status !== "closed" && item.status !== "resolved"
}

export function moneyReviewLabel(item: MobileSupportCase) {
  const status = item.financialAdjustmentApprovalStatus
  if (status === "not_required" && item.moneyImpactRequested) return "Requested"
  if (status === "rejected") return "Not approved"
  return formatSupportValue(status)
}

export function authorName(message: MobileSupportMessage, cooperative: string) {
  return message.authorName || cooperative
}

export function formatSupportDate(
  iso: string,
  options: Intl.DateTimeFormatOptions,
  timezone: string
) {
  const date = new Date(iso)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-NG", {
        ...options,
        timeZone: timezone,
      }).format(date)
    : "—"
}

export function supportDayLabel(
  iso: string,
  timezone: string,
  now = Date.now()
) {
  const key = (timestamp: string) =>
    formatSupportDate(
      timestamp,
      { year: "numeric", month: "numeric", day: "numeric" },
      timezone
    )
  if (key(iso) === key(new Date(now).toISOString())) return "Today"
  if (key(iso) === key(new Date(now - 86_400_000).toISOString()))
    return "Yesterday"
  return formatSupportDate(
    iso,
    { weekday: "short", day: "numeric", month: "short" },
    timezone
  )
}

export function supportTime(iso: string, timezone: string) {
  return formatSupportDate(
    iso,
    { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
    timezone
  )
}

export function previewTime(iso: string, timezone: string) {
  const day = supportDayLabel(iso, timezone)
  if (day === "Today") return supportTime(iso, timezone)
  if (day === "Yesterday") return day
  return formatSupportDate(iso, { day: "numeric", month: "short" }, timezone)
}

export function groupSupportMessages(
  messages: MobileSupportMessage[],
  timezone: string
) {
  const days: {
    date: string
    key: string
    groups: MobileSupportMessage[][]
  }[] = []
  for (const message of messages) {
    const key = formatSupportDate(
      message.createdAt,
      { year: "numeric", month: "numeric", day: "numeric" },
      timezone
    )
    const previous = days.at(-1)
    const day =
      previous?.key === key
        ? previous
        : { date: message.createdAt, key, groups: [] }
    if (day !== previous) days.push(day)
    const group = day.groups.at(-1)
    const author = group?.[0]
    if (
      group &&
      author?.authorType === message.authorType &&
      author.authorName === message.authorName
    ) {
      group.push(message)
    } else {
      day.groups.push([message])
    }
  }
  return days
}
