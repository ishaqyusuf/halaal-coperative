import type { StatusTone } from "@/components/ui/status-pill"
import type {
  RepaymentFacility,
  RepaymentLane,
  RepaymentWorkspaceItem,
} from "./admin-repayment-operations-types"

export const repaymentLanes: { label: string; value: RepaymentLane }[] = [
  { label: "Due", value: "due" },
  { label: "Collections", value: "collections" },
  { label: "Posted", value: "posted" },
]

export type FollowUpOutcome =
  | "promise_to_pay"
  | "reminded"
  | "settled"
  | "unreachable"
export type FollowUpPriority = "high" | "low" | "normal"
export type IconTone = "brand" | "danger" | "info" | "success" | "warning"

export const followUpOutcomes: {
  description: string
  icon: string
  label: string
  tone: IconTone
  value: FollowUpOutcome
}[] = [
  {
    description: "Call, SMS or visit",
    icon: "Bell",
    label: "Reminded",
    tone: "brand",
    value: "reminded",
  },
  {
    description: "Agreed a date",
    icon: "CalendarClock",
    label: "Promise to pay",
    tone: "info",
    value: "promise_to_pay",
  },
  {
    description: "No answer",
    icon: "Phone",
    label: "Unreachable",
    tone: "warning",
    value: "unreachable",
  },
  {
    description: "Says it’s paid",
    icon: "Check",
    label: "Settled",
    tone: "success",
    value: "settled",
  },
]

export const followUpPriorities: { label: string; value: FollowUpPriority }[] =
  [
    { label: "Low", value: "low" },
    { label: "Normal", value: "normal" },
    { label: "High", value: "high" },
  ]

export function outcomeFor(value: string) {
  return (
    followUpOutcomes.find((outcome) => outcome.value === value) ??
    followUpOutcomes[0]!
  )
}

export function priorityLabel(value: string) {
  return (
    followUpPriorities.find((priority) => priority.value === value)?.label ??
    value
  )
}

/** The server's case stage for a follow-up outcome (unchanged from v1). */
export function followUpCaseStage(
  status: FollowUpOutcome,
  priority: FollowUpPriority
) {
  if (status === "settled") return "resolved" as const
  if (status === "promise_to_pay") return "promise_tracking" as const
  return priority === "high" ? ("escalated" as const) : ("active" as const)
}

/* ---------- dates (local calendar days, date-only strings) ---------- */

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function pad(value: number) {
  return String(value).padStart(2, "0")
}

export function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function dateOnlyFromNow(days: number, now = new Date()) {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return toDateOnly(date)
}

function parseDay(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  return new Date(year!, (month ?? 1) - 1, day ?? 1)
}

/** ISO timestamp or date-only → local date for display. */
function toLocal(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDay(value) : new Date(value)
}

/** "17 Nov" or "17 Nov 2026". */
export function formatRepaymentDate(value: string, withYear = false) {
  const date = toLocal(value)
  return `${date.getDate()} ${months[date.getMonth()]}${withYear ? ` ${date.getFullYear()}` : ""}`
}

export function daysFromToday(value: string, now = new Date()) {
  const date = toLocal(value)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((day.getTime() - start.getTime()) / 86_400_000)
}

/** "Today · 17 Nov 2026", "Tomorrow · …", or "Tue 18 Nov 2026". */
export function friendlyDate(value: string, now = new Date()) {
  const days = daysFromToday(value, now)
  const full = formatRepaymentDate(value, true)
  if (days === 0) return `Today · ${full}`
  if (days === 1) return `Tomorrow · ${full}`
  if (days === -1) return `Yesterday · ${full}`
  return `${weekdays[toLocal(value).getDay()]} ${full}`
}

export function dayCount(days: number) {
  return days === 1 ? "1 day" : `${days} days`
}

/* ---------- lane rows ---------- */

export type RowSeverity = "bad" | "brand" | "ok" | "warn"

export function rowSeverity(item: RepaymentWorkspaceItem): RowSeverity {
  if (item.lane === "posted") return "ok"
  if (item.agingDays > 0) return "bad"
  return daysFromToday(item.dueAt) <= 0 ? "warn" : "brand"
}

export function rowStatus(item: RepaymentWorkspaceItem): {
  label: string
  tone: StatusTone
} {
  if (item.lane === "posted") return { label: "Posted", tone: "success" }
  if (item.agingDays > 0)
    return { label: `${dayCount(item.agingDays)} late`, tone: "danger" }
  if (daysFromToday(item.dueAt) <= 0)
    return { label: "Due today", tone: "warning" }
  return { label: `Due ${formatRepaymentDate(item.dueAt)}`, tone: "neutral" }
}

export type FollowUpChip = {
  icon?: string
  label: string
  next?: string
  tone: "brand" | "info" | "neutral" | "vivid" | "warning"
}

export function followUpChip(
  item: RepaymentWorkspaceItem,
  lane: RepaymentLane
): FollowUpChip | null {
  if (item.lane === "posted") return null
  const followUp = item.latestFollowUp
  if (followUp) {
    const next = followUp.nextActionAt
      ? `Next action ${formatRepaymentDate(followUp.nextActionAt)}`
      : undefined
    if (followUp.status === "promise_to_pay")
      return { icon: "CalendarClock", label: "Promise to pay", next, tone: "info" }
    if (followUp.status === "unreachable")
      return { icon: "Phone", label: "Unreachable", next, tone: "vivid" }
    if (followUp.status === "settled")
      return { icon: "Check", label: "Says it’s paid", next, tone: "neutral" }
    return { icon: "Bell", label: "Reminded", next, tone: "neutral" }
  }
  return item.agingDays > 0 && lane === "collections"
    ? { label: "No follow-up", tone: "warning" }
    : null
}

export function laneGroupTitle(
  lane: RepaymentLane,
  item: RepaymentWorkspaceItem,
  now = new Date()
) {
  if (lane === "posted") {
    const ago = -daysFromToday(item.dueAt, now)
    if (ago <= 0) return "Today"
    if (ago === 1) return "Yesterday"
    return ago <= 6 ? "Earlier this week" : "Earlier"
  }
  if (lane === "collections")
    return item.agingDays >= 30
      ? "30+ days overdue"
      : item.agingDays >= 8
        ? "8–29 days overdue"
        : "1–7 days overdue"
  if (item.agingDays > 0) return "Overdue"
  const days = daysFromToday(item.dueAt, now)
  if (days <= 0) return "Due today"
  return days <= 7 ? "Next 7 days" : "Later"
}

export type LaneGroup = {
  attention: boolean
  count: number
  items: RepaymentWorkspaceItem[]
  title: string
  total: number
}

/** Consecutive rows that share a group title (rows arrive server-ordered). */
export function groupLaneItems(
  lane: RepaymentLane,
  items: readonly RepaymentWorkspaceItem[],
  now = new Date()
): LaneGroup[] {
  const groups: LaneGroup[] = []
  for (const item of items) {
    const title = laneGroupTitle(lane, item, now)
    let group = groups[groups.length - 1]
    if (!group || group.title !== title) {
      group = {
        attention: /overdue/i.test(title),
        count: 0,
        items: [],
        title,
        total: 0,
      }
      groups.push(group)
    }
    group.items.push(item)
    group.count += 1
    group.total += item.amount
  }
  return groups
}

/** Keep the first copy of each row when pages overlap after a write. */
export function uniqueRows(items: readonly RepaymentWorkspaceItem[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

/* ---------- facility ---------- */

export type ScheduleRow = RepaymentFacility["schedule"][number]

export function scheduleState(row: ScheduleRow) {
  if (row.outstandingAmount <= 0 || row.state === "paid") return "paid"
  if (row.state === "waived") return "waived"
  if (row.agingDays > 0) return "overdue"
  return daysFromToday(row.dueAt) <= 0 ? "due" : "upcoming"
}

/** Two instalments either side of the next one due (all when `all`). */
export function scheduleWindow(facility: RepaymentFacility, all: boolean) {
  if (all) return facility.schedule
  const next = facility.nextDue?.installmentNumber ?? facility.schedule.length
  return facility.schedule.filter(
    (row) =>
      row.installmentNumber >= next - 2 && row.installmentNumber <= next + 2
  )
}

export function paidInstalments(facility: RepaymentFacility) {
  return facility.schedule.filter((row) => scheduleState(row) === "paid")
    .length
}

/* ---------- forms ---------- */

export type RepaymentDraft = { amount: string; paidAt: string; reference: string }
export type FollowUpDraft = {
  nextActionAt: string
  note: string
  priority: FollowUpPriority
  promiseToPayAt: string
  status: FollowUpOutcome
}

export function validateRepaymentDraft(
  draft: RepaymentDraft,
  outstanding: number,
  formatAmount: (value: number) => string
) {
  const errors: Partial<Record<keyof RepaymentDraft, string>> = {}
  const amount = Number(draft.amount)
  if (!draft.amount || !Number.isFinite(amount) || amount <= 0)
    errors.amount = "Enter the amount received."
  else if (amount > outstanding)
    errors.amount = `Can’t be more than the ${formatAmount(outstanding)} outstanding.`
  if (!draft.paidAt) errors.paidAt = "Choose the payment date."
  if (draft.reference.trim().length < 2)
    errors.reference = "Enter the payment reference."
  return errors
}

export function validateFollowUpDraft(draft: FollowUpDraft) {
  const errors: Partial<Record<keyof FollowUpDraft, string>> = {}
  if (draft.note.trim().length < 4)
    errors.note = "Say what happened and what was agreed."
  if (draft.status === "promise_to_pay" && !draft.promiseToPayAt)
    errors.promiseToPayAt = "Add the date the member promised to pay."
  return errors
}
