import type {
  OpsDetail,
  OpsLane,
  OpsRow,
} from "@/features/admin-service-operations/public/service-ops"
import { shortDate } from "@/features/admin-service-operations/public/service-ops"
import { formatMoney } from "@/lib/money"
import type {
  ProjectFinancingAction,
  ProjectFinancingDetail,
  ProjectFinancingLane,
  ProjectFinancingProject,
  ProjectFinancingStructure,
  ProjectFinancingSummary,
} from "./admin-project-financing-operations-types"

export const structureOptions: {
  description: string
  label: string
  value: Exclude<ProjectFinancingStructure, "undecided">
}[] = [
  { description: "Member repays principal monthly", label: "Repayable facility", value: "repayable_facility" },
  { description: "Evidence only · no repayable principal", label: "Investment partnership", value: "investment_partnership" },
  { description: "Evidence only · profit split on results", label: "Profit sharing", value: "profit_sharing" },
]

export function structureName(structure: ProjectFinancingStructure | null) {
  return structureOptions.find((option) => option.value === structure)?.label ?? "Undecided"
}

export function projectFinancingLanes(
  summary: ProjectFinancingSummary | undefined
): OpsLane<ProjectFinancingLane>[] {
  return [
    {
      count: summary ? summary.blockedCount + summary.readyCount : undefined,
      empty: "Nothing needs action",
      label: "Needs action",
      value: "needs_action",
    },
    { count: summary?.activeCount, empty: "No active projects", label: "Active", value: "active" },
    { count: summary?.closedCount, empty: "No closed projects yet", label: "Closed", value: "closed" },
  ]
}

export function primaryAction(project: ProjectFinancingProject): ProjectFinancingAction | null {
  return project.allowedActions[0] ?? null
}

export const actionLabel: Record<ProjectFinancingAction, string> = {
  activate: "Activate",
  record_disbursement: "Record release",
  review: "Review",
}

function pill(project: ProjectFinancingProject): OpsRow["pill"] {
  switch (project.status) {
    case "submitted":
      return { label: "New", tone: "warning" }
    case "under_review":
      return { label: "In review", tone: "info" }
    case "approved":
      return { label: "Ready to activate", tone: "brand" }
    case "active":
      return project.disbursedAt
        ? { label: "Active", tone: "success" }
        : { label: "Release evidence", tone: "warning" }
    case "rejected":
      return { label: "Rejected", tone: "danger" }
    case "cancelled":
      return { label: "Cancelled", tone: "neutral" }
    default:
      return { label: "Completed", tone: "neutral" }
  }
}

export function projectRow(project: ProjectFinancingProject): OpsRow {
  const action = primaryAction(project)
  const structure = project.approvedStructure ?? project.proposedStructure
  const repayableActive =
    project.status === "active" && project.boundary === "repayable_principal" && project.disbursedAt
  return {
    actionLabel: action ? actionLabel[action] : undefined,
    amount: repayableActive
      ? (project.outstandingPrincipal ?? project.approvedAmount ?? project.requestedAmount)
      : (project.approvedAmount ?? project.requestedAmount),
    id: project.id,
    meta: repayableActive ? "Principal outstanding" : shortDate(project.requestedAt),
    metaTone: project.attention?.severity === "warning" ? "danger" : "muted",
    pill: pill(project),
    subtitle: `${project.member.fullName} · ${structureName(structure)}`,
    title: project.businessName,
  }
}

export function projectDetail(detail: ProjectFinancingDetail, currencyCode: string): OpsDetail {
  const { project } = detail
  const row = projectRow(project)
  const money = (value: number) => formatMoney(value, { currencyCode })
  const structure = project.approvedStructure ?? project.proposedStructure
  const stepIndex =
    ["rejected", "cancelled", "completed"].includes(project.status)
      ? 4
      : project.status === "active"
        ? project.disbursedAt
          ? 3
          : 2
        : project.status === "approved"
          ? 1
          : 0
  const timeline: OpsDetail["timeline"] = [
    {
      meta: `${shortDate(project.requestedAt)} · ${project.member.fullName}`,
      note: project.projectPurpose ?? project.businessDescription ?? undefined,
      title: "Submitted",
    },
  ]
  if (project.reviewedAt)
    timeline.push({
      meta: `${shortDate(project.reviewedAt)} · ${project.reviewedByUser?.fullName ?? "Finance"}`,
      note: project.reviewNotes ?? undefined,
      title: project.status === "rejected" ? "Rejected" : project.status === "under_review" ? "In review" : "Approved",
    })
  if (detail.activation)
    timeline.push({
      meta: `${shortDate(detail.activation.activatedAt)} · ${detail.activation.actor?.fullName ?? "Finance"}`,
      note: detail.activation.notes ?? undefined,
      title: "Activated",
    })
  if (project.disbursedAt)
    timeline.push({
      meta: `${shortDate(project.disbursedAt)} · ${project.disbursedByUser?.fullName ?? "Finance"}`,
      note: [project.disbursementReference, project.disbursementNotes].filter(Boolean).join(" · ") || undefined,
      title: "Release recorded",
    })
  return {
    amount: row.amount,
    facts: [
      ["Member", `${project.member.fullName} · ${project.member.memberNumber}`],
      ...(project.projectPurpose ? ([["Purpose", project.projectPurpose]] as [string, string][]) : []),
      ["Requested", money(project.requestedAmount)],
      ...(project.approvedAmount === null ? [] : ([["Approved", money(project.approvedAmount)]] as [string, string][])),
      ["Structure", structureName(structure)],
      ["Boundary", project.boundary === "repayable_principal" ? "Repayable principal" : "Evidence only"],
      ...(project.approvedPaybackMonths ?? project.requestedPaybackMonths
        ? ([["Term", `${project.approvedPaybackMonths ?? project.requestedPaybackMonths} months`]] as [string, string][])
        : []),
    ],
    headline: project.businessName,
    meta: project.attention?.label ?? row.meta,
    pill: row.pill,
    schedule: detail.repayments.length
      ? {
          rows: detail.repayments.slice(0, 6).map((repayment) => ({
            amount: repayment.amount,
            sub: `${shortDate(repayment.paidAt)}${repayment.paymentReference ? ` · ${repayment.paymentReference}` : ""}`,
            title: "Receipt",
            tone: "success" as const,
          })),
          side: "Posted",
          title: "Principal receipts",
        }
      : undefined,
    stepIndex,
    steps: ["Review", "Activate", "Release", "Active", "Closed"],
    timeline,
    who: `${project.member.fullName} · ${project.member.memberNumber}`,
  }
}

export function projectFinancingHero(summary: ProjectFinancingSummary | undefined) {
  return {
    caption: "Principal outstanding",
    needAction: summary ? summary.blockedCount + summary.readyCount : undefined,
    sub: summary
      ? `${summary.activeCount} active ${summary.activeCount === 1 ? "project" : "projects"} · ${summary.releaseReady} release evidence due`
      : undefined,
    value: summary?.outstandingPrincipal,
  }
}
