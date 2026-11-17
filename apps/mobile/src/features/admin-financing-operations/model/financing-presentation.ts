import type { StatusTone } from "@/components/ui/status-pill"
import { formatCompactMoney, formatMoney } from "@/lib/money"
import type {
  FinancingCycle,
  FinancingCycleState,
  FinancingItem,
  FinancingLane,
} from "./admin-financing-operations-types"

export const financingLanes = [
  { label: "Needs review", value: "review" },
  { label: "Disburse", value: "disbursement" },
  { label: "All activity", value: "activity" },
] as const satisfies readonly { label: string; value: FinancingLane }[]

const STATE: Record<string, [string, StatusTone]> = {
  active: ["Repaying", "success"],
  approved: ["Approved", "brand"],
  cancelled: ["Cancelled", "neutral"],
  disbursed: ["Disbursed", "success"],
  rejected: ["Rejected", "danger"],
  repaid: ["Repaid", "neutral"],
  submitted: ["Submitted", "info"],
  under_review: ["Under review", "lilac"],
}

export function financingState(state: string) {
  const [label, tone] = STATE[state] ?? [
    state.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase()),
    "neutral" as StatusTone,
  ]
  return { label, tone }
}

/** "40m", "9h", "3d" since the request was sent. */
export function ageOf(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`
}

export function shortProduct(item: FinancingItem) {
  return item.productName.replace(/\s+financing$/i, "")
}

/**
 * Lane pages skip cycle health; add its capacity blockers here from the
 * summary. Approve and disburse still re-check on the server.
 */
export function withCapacityBlockers(
  item: FinancingItem,
  cycle: FinancingCycle | undefined,
  currencyCode: string
): FinancingItem {
  if (!cycle) return item
  const blockers = [...item.blockers]
  if (item.kind === "request" && item.actions.includes("review")) {
    const usage = item.loanType === "quick" ? cycle.quick : cycle.normal
    if (usage.remainingAmount < 0)
      blockers.push("The cycle allocation no longer covers this reservation.")
  }
  if (item.kind === "loan" && item.actions.includes("disburse")) {
    const available = cycle.deployableFunds.deployableFunds + item.amount
    if (item.amount > available)
      blockers.push(
        `Deployable funds available for this release are ${formatMoney(available, { currencyCode })}.`
      )
  }
  return blockers.length === item.blockers.length ? item : { ...item, blockers }
}

export function approvalsRecorded(item: FinancingItem) {
  return item.approvals.filter((approval) => approval.action === "approved")
    .length
}

/** The row's one-line status: a blocker, or what happens next. */
export function rowFlag(
  item: FinancingItem,
  lane: FinancingLane
): { label: string; tone: "ok" | "warn" | "state" } {
  if (lane === "activity")
    return { label: financingState(item.state).label, tone: "state" }
  if (item.blockers.length) return { label: item.blockers[0]!, tone: "warn" }
  if (item.kind === "loan") return { label: "Ready to release", tone: "ok" }
  return {
    label: approvalsRecorded(item) ? "Needs second approval" : "Ready to decide",
    tone: "ok",
  }
}

export type FinancingCheck = { label: string; ok: boolean; value: string }

export function financingChecks(input: {
  currencyCode: string
  cycle?: FinancingCycle
  item: FinancingItem
  requiresDualApproval: boolean
}): FinancingCheck[] {
  const { item, cycle, currencyCode } = input
  const guarantors = item.evidence.find((line) => /guarantor/.test(line)) ?? ""
  const [approvedGuarantors, totalGuarantors] = (
    guarantors.match(/\d+/g) ?? []
  ).map(Number)
  const needed = input.requiresDualApproval ? 2 : 1
  if (item.kind === "loan") {
    const short = item.blockers.some((line) => /Deployable funds/.test(line))
    return [
      {
        label: "Deployable funds",
        ok: !short,
        value: short
          ? item.blockers.find((line) => /Deployable funds/.test(line))!.replace(/^Deployable funds available for this release are /, "").replace(/\.$/, "") + " available"
          : cycle
            ? `${formatCompactMoney(cycle.deployableFunds.deployableFunds, currencyCode)} available`
            : "Checked again on release",
      },
      { label: "Finance approvals", ok: true, value: `${approvalsRecorded(item)} of ${needed} recorded` },
      {
        label: "Guarantors",
        ok: true,
        value: !approvedGuarantors ? "None required" : `${approvedGuarantors} approved`,
      },
    ]
  }
  const over = item.blockers.some((line) => /eligibility/.test(line))
  const otherFinancing = item.blockers.some((line) => /active financing/.test(line))
  const usage = cycle ? (item.loanType === "quick" ? cycle.quick : cycle.normal) : null
  return [
    {
      label: "Guarantors",
      ok: approvedGuarantors !== undefined && approvedGuarantors === totalGuarantors,
      value:
        approvedGuarantors === undefined || !totalGuarantors
          ? "None required"
          : `${approvedGuarantors} of ${totalGuarantors} approved`,
    },
    { label: "Finance approvals", ok: true, value: `${approvalsRecorded(item)} of ${needed} recorded` },
    { label: "Eligibility", ok: !over, value: over ? "Above its eligibility snapshot" : "Within its snapshot" },
    { label: "Other financing", ok: !otherFinancing, value: otherFinancing ? "Active financing blocks quick financing" : "None blocking" },
    {
      label: `${item.loanType === "quick" ? "Quick" : "Normal"} capacity`,
      ok: !usage || usage.remainingAmount >= 0,
      value: usage ? `${formatCompactMoney(Math.max(0, usage.remainingAmount), currencyCode)} left this cycle` : "Checked on approval",
    },
  ]
}

export type HistoryStep = { action: string; actor: string; at: string; note: string | null }

export function financingHistory(item: FinancingItem): HistoryStep[] {
  const words: Record<string, string> = {
    approved: "Approved",
    disbursed: "Released the money",
    rejected: "Rejected",
    under_review: "Marked under review",
  }
  return [
    { action: "requested", actor: item.member.name, at: item.requestedAt, note: null },
    ...item.approvals.map((approval) => ({
      action: words[approval.action] ?? financingState(approval.action).label,
      actor: approval.actorName,
      at: approval.actedAt,
      note: approval.notes,
    })),
  ].map((step) => ({ ...step, action: step.action === "requested" ? "Sent the request" : step.action }))
}

export type ReviewDecision = "approved" | "rejected" | "under_review"

export function decisionAfter(
  decision: ReviewDecision,
  item: FinancingItem,
  requiresDualApproval: boolean
) {
  if (decision === "rejected") return "The member is told"
  if (decision === "under_review") return "Stays in Needs review"
  return requiresDualApproval && approvalsRecorded(item) === 0
    ? "Needs one more approval"
    : "Moves to Disburse"
}

export type CycleTarget = "closed" | "open" | "paused"

export function cycleState(cycle: FinancingCycle | undefined): FinancingCycleState {
  if (!cycle) return "missing"
  return cycle.status === "draft" ? "draft" : cycle.intakeStatus
}

export function cycleTargets(state: FinancingCycleState): CycleTarget[] {
  if (state === "missing" || state === "draft") return ["open"]
  if (state === "paused") return ["open", "closed"]
  if (state === "open") return ["paused", "closed"]
  return []
}

export function cycleLabel(state: FinancingCycleState) {
  return {
    closed: "Closed",
    draft: "Not opened",
    missing: "Not opened",
    open: "Open",
    paused: "Paused",
  }[state]
}

export function cycleMonth(cycle: FinancingCycle | undefined, now = new Date()) {
  const date = cycle ? new Date(cycle.periodStart) : now
  return date.toLocaleString("en-NG", { month: "long", timeZone: "UTC" })
}

/** Left to finance = quick + normal remaining, never below zero. */
export function leftToFinance(cycle: FinancingCycle) {
  return Math.max(0, cycle.quick.remainingAmount) + Math.max(0, cycle.normal.remainingAmount)
}

export function usageShares(cycle: FinancingCycle) {
  const total = cycle.totalCapacityAmount || 1
  const disbursed = cycle.quick.disbursedAmount + cycle.normal.disbursedAmount
  const reserved =
    cycle.quick.requestedReservedAmount +
    cycle.quick.approvedAmount +
    cycle.normal.requestedReservedAmount +
    cycle.normal.approvedAmount
  return {
    disbursed,
    disbursedShare: Math.min(1, disbursed / total),
    reserved,
    reservedShare: Math.min(1 - Math.min(1, disbursed / total), reserved / total),
  }
}

export const evidenceMin = 4
export const evidenceMax = 1000

export function evidenceError(note: string) {
  return note.trim().length < evidenceMin
    ? "Add at least a few words about what you checked."
    : null
}
