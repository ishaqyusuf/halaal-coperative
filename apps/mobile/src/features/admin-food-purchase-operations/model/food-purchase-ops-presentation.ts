import { shortDate } from "@/features/admin-service-operations/public/service-ops"
import type {
  OpsDetail,
  OpsLane,
  OpsRow,
} from "@/features/admin-service-operations/public/service-ops"
import { formatCompactMoney, formatMoney } from "@/lib/money"
import type {
  FoodPurchaseApplication,
  FoodPurchaseCapabilities,
  FoodPurchaseCycle,
  FoodPurchaseCycleStatus,
  FoodPurchaseLane,
  FoodPurchaseWorkspace,
} from "./admin-food-purchase-operations-types"

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

/** "November 2026" from a cycle's periodMonth (ISO or date-only). */
export function cycleMonth(periodMonth: string) {
  const [year, month] = periodMonth.slice(0, 7).split("-").map(Number)
  return `${monthNames[(month ?? 1) - 1]} ${year}`
}

export const accountingStatuses: FoodPurchaseCycleStatus[] = [
  "intake_closed",
  "accounting_rejected",
  "accounting_submitted",
  "accounting_approved",
]
export const historyStatuses: FoodPurchaseCycleStatus[] = ["completed", "cancelled", "closed"]

export type CycleAction = "acct" | "acctrev" | "complete"

export function cycleAction(
  cycle: FoodPurchaseCycle,
  capabilities: FoodPurchaseCapabilities | undefined
): CycleAction | null {
  if (["intake_closed", "accounting_rejected"].includes(cycle.status))
    return capabilities?.submitAccounting ? "acct" : null
  if (cycle.status === "accounting_submitted")
    return capabilities?.reviewAccounting ? "acctrev" : null
  if (cycle.status === "accounting_approved")
    return capabilities?.reviewAccounting ? "complete" : null
  return null
}

export const cycleActionLabel: Record<CycleAction, string> = {
  acct: "Submit accounting",
  acctrev: "Review accounting",
  complete: "Complete cycle",
}

/** Intake transition for the current cycle's card. */
export function intakeTransition(cycle: FoodPurchaseCycle) {
  if (cycle.status === "draft") return { label: "Open intake", transition: "open_intake" as const }
  if (cycle.status === "open") return { label: "Close intake", transition: "close_intake" as const }
  if (cycle.status === "intake_closed")
    return { label: "Reopen intake", transition: "reopen_intake" as const }
  return null
}

export function cycleStatusPill(cycle: FoodPurchaseCycle): NonNullable<OpsRow["pill"]> {
  switch (cycle.status) {
    case "draft":
      return { label: "Draft", tone: "neutral" }
    case "open":
      return { label: "Intake open", tone: "brand" }
    case "intake_closed":
      return { label: "Accounting due", tone: "warning" }
    case "accounting_submitted":
      return { label: "Awaiting review", tone: "info" }
    case "accounting_rejected":
      return { label: "Returned", tone: "danger" }
    case "accounting_approved":
      return { label: "Ready to complete", tone: "brand" }
    case "cancelled":
      return { label: "Cancelled", tone: "neutral" }
    default:
      return { label: "Completed", tone: "neutral" }
  }
}

export function cycleRow(
  cycle: FoodPurchaseCycle,
  capabilities: FoodPurchaseCapabilities | undefined,
  currencyCode: string
): OpsRow {
  const action = cycleAction(cycle, capabilities)
  const history = historyStatuses.includes(cycle.status)
  return {
    actionLabel: action ? cycleActionLabel[action] : undefined,
    amount: cycle.releasedAmount,
    avatarText: cycleMonth(cycle.periodMonth).slice(0, 3),
    id: cycle.id,
    meta:
      history && cycle.profitAmount !== null
        ? `${formatCompactMoney(cycle.profitAmount, currencyCode)} profit`
        : undefined,
    pill: cycleStatusPill(cycle),
    subtitle: `Released ${shortDate(cycle.releasedAt)}`,
    title: cycleMonth(cycle.periodMonth),
  }
}

export function applicationRow(
  application: FoodPurchaseApplication,
  capabilities: FoodPurchaseCapabilities | undefined
): OpsRow {
  const reviewable = ["submitted", "under_review"].includes(application.status)
  return {
    actionLabel: reviewable && capabilities?.reviewApplications ? "Review" : undefined,
    amount: application.approvedAmount ?? application.requestedAmount,
    id: application.id,
    meta: shortDate(application.requestedAt),
    pill:
      application.status === "submitted"
        ? { label: "New", tone: "warning" }
        : application.status === "under_review"
          ? { label: "In review", tone: "info" }
          : application.status === "approved"
            ? { label: "Approved", tone: "brand" }
            : application.status === "rejected"
              ? { label: "Rejected", tone: "danger" }
              : { label: "Cancelled", tone: "neutral" },
    subtitle: `${application.itemDescription ?? "Foodstuff"} · ${application.approvedPaybackMonths ?? application.requestedPaybackMonths} months`,
    title: application.member.fullName,
  }
}

export function foodPurchaseLanes(
  overview: FoodPurchaseWorkspace | undefined
): OpsLane<FoodPurchaseLane>[] {
  const cycles = overview?.cycles ?? []
  return [
    {
      count: overview?.summary.totalApplications,
      empty: "No applications in this cycle",
      label: "Applications",
      value: "applications",
    },
    {
      count: overview ? cycles.filter((cycle) => accountingStatuses.includes(cycle.status)).length : undefined,
      empty: "No cycle waiting for accounting",
      label: "Accounting",
      value: "accounting",
    },
    {
      count: overview ? cycles.filter((cycle) => historyStatuses.includes(cycle.status)).length : undefined,
      empty: "No closed cycles yet",
      label: "History",
      value: "history",
    },
  ]
}

export function foodPurchaseHero(overview: FoodPurchaseWorkspace | undefined, currencyCode: string) {
  const cycle = overview?.selectedCycle
  const accountingDue = overview
    ? overview.cycles.filter((item) => ["intake_closed", "accounting_rejected", "accounting_submitted", "accounting_approved"].includes(item.status)).length
    : 0
  return {
    caption: "Available to allocate",
    needAction: overview ? overview.summary.pendingApplications + accountingDue : undefined,
    sub: cycle
      ? `${cycleMonth(cycle.periodMonth)} · ${formatCompactMoney(cycle.releasedAmount, currencyCode)} released · ${formatCompactMoney(overview!.summary.approvedAmount, currencyCode)} approved`
      : overview
        ? "No cycle yet · create one to open intake"
        : undefined,
    value: overview?.summary.availableAmount,
  }
}

export function applicationDetail(
  application: FoodPurchaseApplication,
  currencyCode: string,
  available: number | undefined
): OpsDetail {
  const row = applicationRow(application, undefined)
  const money = (value: number) => formatMoney(value, { currencyCode })
  const timeline: OpsDetail["timeline"] = [
    {
      meta: `${shortDate(application.requestedAt)} · ${application.member.fullName}`,
      note: application.requestNotes ?? undefined,
      title: "Applied",
    },
  ]
  if (application.reviewedAt)
    timeline.push({
      meta: shortDate(application.reviewedAt),
      note: application.reviewNotes ?? undefined,
      title: application.status === "rejected" ? "Rejected" : application.status === "under_review" ? "In review" : "Approved",
    })
  return {
    amount: row.amount,
    facts: [
      ["Member", `${application.member.fullName} · ${application.member.memberNumber}`],
      ["Items", application.itemDescription ?? "Foodstuff"],
      ["Requested", money(application.requestedAmount)],
      ...(application.approvedAmount === null ? [] : ([["Approved", money(application.approvedAmount)]] as [string, string][])),
      ["Payback", `${application.approvedPaybackMonths ?? application.requestedPaybackMonths} months`],
      [
        "Cycle",
        `${cycleMonth(application.cycle.periodMonth)}${available === undefined ? "" : ` · ${formatCompactMoney(available, currencyCode)} available`}`,
      ],
    ],
    headline: application.itemDescription ?? "Foodstuff purchase",
    meta: row.meta,
    pill: row.pill,
    stepIndex: application.status === "approved" ? 2 : application.reviewedAt ? 1 : 0,
    steps: ["Applied", "Reviewed", "Payback"],
    timeline,
    who: `${application.member.fullName} · ${application.member.memberNumber}`,
  }
}

export function cycleDetail(cycle: FoodPurchaseCycle, currencyCode: string): OpsDetail {
  const money = (value: number) => formatMoney(value, { currencyCode })
  const pill = cycleStatusPill(cycle)
  const stepIndex = historyStatuses.includes(cycle.status)
    ? 3
    : cycle.status === "accounting_submitted" || cycle.status === "accounting_approved"
      ? 2
      : cycle.status === "intake_closed" || cycle.status === "accounting_rejected"
        ? 1
        : 0
  const timeline: OpsDetail["timeline"] = [
    {
      meta: `${shortDate(cycle.releasedAt)} · ${cycle.releasedByUser.fullName}`,
      note: cycle.releaseNotes ?? `Committee released ${money(cycle.releasedAmount)}`,
      title: "Cycle created",
    },
  ]
  if (cycle.accountingSubmittedAt)
    timeline.push({
      meta: `${shortDate(cycle.accountingSubmittedAt)} · ${cycle.accountingSubmittedByUser?.fullName ?? "Finance"}`,
      note: cycle.accountingNotes ?? undefined,
      title: "Accounting submitted",
    })
  return {
    amount: cycle.releasedAmount,
    facts: [
      ["Status", pill.label],
      ["Released", money(cycle.releasedAmount)],
      ...(cycle.salesAmount === null
        ? []
        : ([
            ["Sales", money(cycle.salesAmount)],
            ["Purchase cost", money(cycle.purchaseCostAmount ?? 0)],
            ["Expenses", money(cycle.operatingExpenseAmount ?? 0)],
            ["Profit", money(cycle.profitAmount ?? 0)],
          ] as [string, string][])),
    ],
    headline: `${cycleMonth(cycle.periodMonth)} cycle`,
    meta: `Released ${shortDate(cycle.releasedAt, true)}`,
    pill,
    stepIndex,
    steps: ["Intake", "Accounting", "Review", "Completed"],
    timeline,
    who: "Foodstuff purchase cycle",
  }
}
