import type { MemberStateTone } from "@/lib/members/member-status-words"
import { formatDayMonthYear } from "@/utils/format"

type Word = { label: string; tone: MemberStateTone }

export type BusinessStatus = "planned" | "active" | "completed" | "archived"

const businessStatusWords: Record<BusinessStatus, Word> = {
  active: { label: "Running", tone: "good" },
  archived: { label: "Archived", tone: "muted" },
  completed: { label: "Finished", tone: "muted" },
  planned: { label: "Not started", tone: "warning" },
}

/** One plain word for where a business stands. */
export function getBusinessStatusWord(status: string): Word {
  return (
    businessStatusWords[status as BusinessStatus] ?? {
      label: "Unknown",
      tone: "muted",
    }
  )
}

/** Choices for the business status field and the list filter. */
export const businessStatusOptions: Array<{
  label: string
  value: BusinessStatus
}> = [
  { label: "Running", value: "active" },
  { label: "Not started", value: "planned" },
  { label: "Finished", value: "completed" },
  { label: "Archived", value: "archived" },
]

/**
 * A profit entry, in words: recorded, waiting in a closed season, or shared
 * with members. Drafts and reviews are office steps, not member facts.
 */
export function getProfitEntryWord(entry: {
  isShared: boolean
  status: string
}): Word {
  if (entry.isShared || entry.status === "completed") {
    return { label: "Shared", tone: "good" }
  }

  if (entry.status === "reviewed" || entry.status === "approved") {
    return { label: "Waiting to share", tone: "warning" }
  }

  return { label: "Recorded", tone: "muted" }
}

export type SeasonStatus = "draft" | "approved" | "published" | "closed"

const seasonWords: Record<SeasonStatus, Word> = {
  approved: { label: "Ready to share", tone: "warning" },
  closed: { label: "Closed", tone: "muted" },
  draft: { label: "Open", tone: "muted" },
  published: { label: "Shared", tone: "good" },
}

/** One plain word for a profit-sharing season. */
export function getSeasonWord(status: string): Word {
  return (
    seasonWords[status as SeasonStatus] ?? { label: "Unknown", tone: "muted" }
  )
}

/** "1 Jan 2026 to 31 Dec 2026". */
export function formatDateRange(start: string, end: string | null) {
  const from = formatDayMonthYear(start) ?? start
  const to = end ? (formatDayMonthYear(end) ?? end) : null

  return to ? `${from} to ${to}` : `Since ${from}`
}

/** "Started 1 Aug 2025" or "1 Feb 2025 to 30 Nov 2025" for a finished one. */
export function formatBusinessDates(start: string, end: string | null) {
  return end
    ? formatDateRange(start, end)
    : `Started ${formatDayMonthYear(start) ?? start}`
}

/** Today as `YYYY-MM-DD` in the user's time zone (date inputs). */
export function todayInputDate() {
  const date = new Date()

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

export type ProfitPayoutDestination = "savings" | "cash" | "bank_transfer"

/** How shared profit can be paid out, in the order staff pick from. */
export const profitPayoutDestinationOptions: Array<{
  label: string
  value: ProfitPayoutDestination
}> = [
  { label: "To savings", value: "savings" },
  { label: "Cash", value: "cash" },
  { label: "Bank transfer", value: "bank_transfer" },
]

/** Where paid profit went: "to savings", "in cash", "by bank transfer". */
export function profitPayoutWords(destination: string) {
  if (destination === "cash") return "in cash"
  if (destination === "bank_transfer") return "by bank transfer"
  return "to savings"
}
