/**
 * Plain words for member requests: procurement (an item the cooperative buys),
 * project financing (business funding) and foodstuff purchase. All three pages
 * use the same status words, tones and steps so members and staff read one
 * language.
 */
import type { MemberStateTone } from "@/lib/members/member-status-words"

export type RequestKind = "foodPurchase" | "procurement" | "projectFinancing"

export type RequestStatus =
  | "active"
  | "approved"
  | "cancelled"
  | "completed"
  | "purchased"
  | "rejected"
  | "submitted"
  | "under_review"

export type RequestStateInput = {
  /** Food purchase: approved amount, to tell "Repaying" from "Paid off". */
  approvedAmount?: number | null
  kind: RequestKind
  paidAmount?: number | null
  /** Project financing: only a repayable facility is paid back. */
  repayable?: boolean
  status: string
}

export type RequestState = {
  label: string
  /** Index into `getRequestSteps(kind)`; -1 when the request stopped. */
  step: number
  tone: MemberStateTone
}

/** The steps a request moves through, in plain words. */
export function getRequestSteps(kind: RequestKind, repayable = true) {
  if (kind === "procurement") {
    return ["Asked", "Checked", "Approved", "Bought", "Paid off"]
  }

  if (kind === "projectFinancing") {
    return repayable
      ? ["Asked", "Checked", "Approved", "Paid out", "Paid off"]
      : ["Asked", "Checked", "Approved", "Paid out"]
  }

  return ["Asked", "Checked", "Approved", "Paid off"]
}

export function isPendingRequest(status: string) {
  return status === "submitted" || status === "under_review"
}

export function getRequestState(input: RequestStateInput): RequestState {
  const { kind, status } = input
  const repayable = input.repayable ?? true

  switch (status) {
    case "submitted":
      return { label: "Waiting", step: 0, tone: "warning" }
    case "under_review":
      return { label: "Being checked", step: 1, tone: "warning" }
    case "rejected":
      return { label: "Declined", step: -1, tone: "danger" }
    case "cancelled":
      return { label: "Cancelled", step: -1, tone: "muted" }
    case "completed":
      return {
        label: "Paid off",
        step: getRequestSteps(kind, repayable).length - 1,
        tone: "good",
      }
    case "purchased":
    case "active":
      if (kind === "projectFinancing" && !repayable) {
        return { label: "Paid out", step: 3, tone: "good" }
      }
      return { label: "Repaying", step: 3, tone: "good" }
    case "approved": {
      if (kind === "foodPurchase") {
        const approved = Number(input.approvedAmount ?? 0)
        const paid = Number(input.paidAmount ?? 0)

        if (approved > 0 && paid >= approved) {
          return { label: "Paid off", step: 3, tone: "good" }
        }

        if (paid > 0) {
          return { label: "Repaying", step: 2, tone: "good" }
        }
      }

      return { label: "Approved", step: 2, tone: "good" }
    }
    default:
      return { label: status.replaceAll("_", " "), step: 0, tone: "muted" }
  }
}

/** What happens next, for the member reading their own request. */
export function getRequestNextStep(input: RequestStateInput) {
  const repayable = input.repayable ?? true

  switch (input.status) {
    case "submitted":
    case "under_review":
      return "The cooperative will check your request and tell you."
    case "approved":
      if (input.kind === "procurement") {
        return "Approved. The cooperative will buy the item."
      }
      if (input.kind === "projectFinancing") {
        return "Approved. The cooperative will pay out the money."
      }
      return getRequestState(input).label === "Paid off"
        ? "Fully paid. Thank you."
        : "Approved. Pay back as agreed."
    case "purchased":
    case "active":
      return input.kind === "projectFinancing" && !repayable
        ? "The money has been paid out."
        : "Pay back each month as agreed."
    case "completed":
      return "Fully paid. Thank you."
    case "rejected":
      return "This request was declined."
    case "cancelled":
      return "This request was cancelled."
    default:
      return null
  }
}

/** Status filter choices in plain words (value = stored status). */
export function getRequestStatusFilterOptions(kind: RequestKind) {
  const base = [
    { label: "Waiting", value: "submitted" },
    { label: "Being checked", value: "under_review" },
    { label: "Approved", value: "approved" },
  ]

  if (kind === "foodPurchase") {
    return [
      ...base,
      { label: "Declined", value: "rejected" },
      { label: "Cancelled", value: "cancelled" },
    ]
  }

  return [
    ...base,
    ...(kind === "procurement"
      ? [{ label: "Bought", value: "purchased" }]
      : []),
    {
      label: kind === "procurement" ? "Repaying" : "Paid out",
      value: "active",
    },
    { label: "Paid off", value: "completed" },
    { label: "Declined", value: "rejected" },
    { label: "Cancelled", value: "cancelled" },
  ]
}

const projectFinancingTypeLabels: Record<string, string> = {
  investment_partnership: "Partnership",
  profit_sharing: "Share the profit",
  repayable_facility: "Pay back monthly",
  undecided: "Not sure yet",
}

/** How project funding comes back to the cooperative, in plain words. */
export const projectFinancingTypeOptions = [
  { label: "Pay back monthly", value: "repayable_facility" },
  { label: "Share the profit", value: "profit_sharing" },
  { label: "Partnership", value: "investment_partnership" },
  { label: "Not sure yet", value: "undecided" },
] as const

/** Project financing "structure" in plain words. */
export function getProjectFinancingTypeLabel(value: string | null | undefined) {
  if (!value) return "Not sure yet"

  return projectFinancingTypeLabels[value] ?? value.replaceAll("_", " ")
}

export function formatMonths(months: number | null | undefined) {
  if (!months) return null

  return months === 1 ? "1 month" : `${months} months`
}

const scheduleStatusLabels: Record<string, string> = {
  due: "Due today",
  overdue: "Late",
  paid: "Paid",
  partially_paid: "Part paid",
  pending: "Not due yet",
  waived: "Waived",
}

/** One repayment line's status in plain words. */
export function getRepaymentStatusLabel(status: string) {
  return scheduleStatusLabels[status] ?? status.replaceAll("_", " ")
}

/** Today as `yyyy-mm-dd` for date inputs. */
export function todayInputValue(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

/** The first day of next month as `yyyy-mm-dd`. */
export function firstOfNextMonthInputValue(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10)
}

/** Amount per month, rounded to kobo; null when it can't be worked out. */
export function monthlyAmount(total: number, months: number) {
  if (!(total > 0) || !Number.isInteger(months) || months <= 0) return null

  return Math.round((total / months) * 100) / 100
}

const foodCycleStates: Record<
  string,
  { label: string; tone: MemberStateTone }
> = {
  accounting_approved: { label: "Figures accepted", tone: "good" },
  accounting_rejected: { label: "Figures need fixing", tone: "warning" },
  accounting_submitted: { label: "Figures sent", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "muted" },
  closed: { label: "Closed", tone: "muted" },
  completed: { label: "Done", tone: "good" },
  draft: { label: "Draft", tone: "muted" },
  intake_closed: { label: "Closed for requests", tone: "muted" },
  open: { label: "Open for requests", tone: "good" },
}

/** A foodstuff month (cycle) status in plain words. */
export function getFoodCycleState(status: string) {
  return (
    foodCycleStates[status] ?? {
      label: status.replaceAll("_", " "),
      tone: "muted" as const,
    }
  )
}

const monthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
})

/** "November 2026". */
export function formatMonthYear(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value

  return Number.isNaN(date.getTime()) ? "" : monthYear.format(date)
}

/** Hide system keys (for example brought-forward opening balances) from people. */
export function readableReference(value: string | null | undefined) {
  if (!value || /^opening-balance:/i.test(value)) return null

  return value
}
