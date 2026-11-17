import type { StatusTone } from "@/components/ui/status-pill"
import type {
  AllocationPreference,
  CollectionBatchSummary,
} from "./admin-contribution-operations-types"

export const allocationOptions: readonly {
  description: string
  label: string
  value: AllocationPreference
}[] = [
  {
    description: "Fill the commitment, then special savings, then financing",
    label: "Savings first",
    value: "savings_first",
  },
  {
    description: "Cover the financing servicing before savings",
    label: "Financing first",
    value: "loan_first",
  },
  {
    description: "Use the amounts exactly as entered",
    label: "Manual split",
    value: "manual_split",
  },
]

export function allocationLabel(value: AllocationPreference) {
  return allocationOptions.find((option) => option.value === value)?.label ?? ""
}

const STATUS: Record<string, [StatusTone, string]> = {
  active: ["success", "Active"],
  blocked: ["danger", "Blocked"],
  closed: ["neutral", "Closed"],
  collected: ["brand", "Collected"],
  exception: ["danger", "Exception"],
  exited: ["neutral", "Exited"],
  partially_posted: ["warning", "Partly posted"],
  pending: ["warning", "Pending"],
  posted: ["success", "Posted"],
  reversed: ["neutral", "Reversed"],
  skipped: ["neutral", "Skipped"],
  staged: ["neutral", "Staged"],
  suspended: ["warning", "Suspended"],
}

export function contributionStatus(status: string): {
  label: string
  tone: StatusTone
} {
  const [tone, label] = STATUS[status] ?? [
    "neutral",
    status.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase()),
  ]
  return { label, tone }
}

const CHANNELS: Record<string, string> = {
  cash: "Cash",
  manual: "Manual",
  payroll: "Payroll",
  transfer: "Transfer",
}

export function channelLabel(channel: string) {
  return CHANNELS[channel] ?? contributionStatus(channel).label
}

/** "25,000" | "" → number (empty counts as 0); invalid → null. */
export function amountOf(raw: string) {
  const trimmed = raw.replace(/,/g, "").trim()
  if (!trimmed) return 0
  const value = Number(trimmed)
  return Number.isFinite(value) && value >= 0 ? value : null
}

/**
 * The record-payment form takes one "Financing payment". Scheduled
 * servicing takes up to the amount due this month; the rest pays the
 * financing down early.
 */
export function splitFinancingPayment(amount: number, dueThisMonth: number) {
  const scheduled = Math.min(amount, Math.max(0, dueThisMonth))
  return { extraPayoff: amount - scheduled, scheduled }
}

export type PaymentDraft = {
  committed: string
  financing: string
  special: string
}

export function validatePayment(
  draft: PaymentDraft,
  hasFinancing: boolean
):
  | { error: string; ok: false }
  | { committed: number; financing: number; ok: true; special: number; total: number } {
  const committed = amountOf(draft.committed)
  const special = amountOf(draft.special)
  const financing = hasFinancing ? amountOf(draft.financing) : 0
  if (committed === null || special === null || financing === null)
    return { error: "Enter valid payment amounts.", ok: false }
  const total = committed + special + financing
  if (total <= 0) return { error: "Enter at least one payment amount.", ok: false }
  return { committed, financing, ok: true, special, total }
}

export function paymentTotal(draft: PaymentDraft, hasFinancing: boolean) {
  return [draft.committed, draft.special, hasFinancing ? draft.financing : ""]
    .map((value) => amountOf(value) ?? 0)
    .reduce((total, value) => total + value, 0)
}

export function validatePlanAmount(raw: string) {
  const amount = amountOf(raw)
  return amount && amount > 0
    ? { amount, error: null }
    : { amount: null, error: "Enter a commitment greater than zero." }
}

export type RowStatus = "collected" | "exception" | "skipped"

export function validateRow(input: {
  amount: string
  reason: string
  status: RowStatus
}) {
  const errors: { amount?: string; reason?: string } = {}
  const amount = amountOf(input.amount)
  if (input.status === "collected" && !(amount && amount > 0))
    errors.amount = "Enter the collected amount."
  if (input.status === "exception" && !input.reason.trim())
    errors.reason = "Enter an exception reason."
  return errors
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function monthLabel(year: number, month: number) {
  return `${MONTHS[month - 1] ?? ""} ${year}`
}

/** "2026-11-03T…" → "November 2026" (UTC, matching posting dates). */
export function periodOf(iso: string) {
  const date = new Date(iso)
  return monthLabel(date.getUTCFullYear(), date.getUTCMonth() + 1)
}

/** Months that already have a batch for the source, from loaded batches. */
export function stagedPeriods(
  batches: readonly CollectionBatchSummary[],
  sourceId: string
) {
  return new Set(
    batches
      .filter((batch) => batch.deductionSource.id === sourceId)
      .map((batch) => `${batch.periodYear}-${batch.periodMonth}`)
  )
}

export function duplicatePeriodError(input: {
  batches: readonly CollectionBatchSummary[]
  month: number
  sourceId: string
  sourceName: string
  year: number
}) {
  return stagedPeriods(input.batches, input.sourceId).has(
    `${input.year}-${input.month}`
  )
    ? `${input.sourceName} already has a ${monthLabel(input.year, input.month)} batch.`
    : null
}
