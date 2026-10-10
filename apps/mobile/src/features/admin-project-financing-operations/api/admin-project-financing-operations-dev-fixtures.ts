import type {
  ProjectFinancingCommandResult,
  ProjectFinancingDetail,
  ProjectFinancingLane,
  ProjectFinancingProject,
  ProjectFinancingStatus,
  ProjectFinancingStructure,
  ProjectFinancingWorkspace,
} from "../model/admin-project-financing-operations-types"

const generatedAt = new Date().toISOString()
const today = new Date().toISOString()
const earlier = new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString()

function project(
  input: Pick<
    ProjectFinancingProject,
    "approvedAmount" | "approvedStructure" | "businessName" | "id" | "status"
  > &
    Partial<ProjectFinancingProject>
): ProjectFinancingProject {
  const repayable = input.approvedStructure === "repayable_facility"
  const activeWithoutEvidence = input.status === "active" && !input.disbursedAt
  const allowedActions =
    input.status === "submitted" || input.status === "under_review"
      ? (["review"] as const)
      : input.status === "approved"
        ? (["activate"] as const)
        : activeWithoutEvidence
          ? (["record_disbursement"] as const)
          : ([] as const)
  const attention =
    input.status === "submitted" || input.status === "under_review"
      ? {
          label:
            input.proposedStructure === "undecided"
              ? "Activation locked · structure review required"
              : "Review decision required",
          severity: "blocked" as const,
        }
      : input.status === "approved"
        ? {
            label: "Approved structure is ready to activate",
            severity: "ready" as const,
          }
        : activeWithoutEvidence
          ? {
              label: "Release evidence is missing",
              severity: "warning" as const,
            }
          : null

  return {
    allowedActions: [...allowedActions],
    approvedAmount: input.approvedAmount,
    approvedMonthlyPayback:
      input.approvedMonthlyPayback ??
      (repayable && input.approvedAmount ? input.approvedAmount / 12 : null),
    approvedPaybackMonths:
      input.approvedPaybackMonths ?? (repayable ? 12 : null),
    approvedStructure: input.approvedStructure,
    attention,
    boundary: repayable ? "repayable_principal" : "evidence_only",
    businessDescription:
      input.businessDescription ??
      "A member-owned business with documented cooperative review evidence.",
    businessName: input.businessName,
    disbursedAt: input.disbursedAt ?? null,
    disbursedByUser: input.disbursedAt
      ? { fullName: "Fatima Yusuf", id: "11111111-1111-4111-8111-111111111111" }
      : null,
    disbursementNotes: input.disbursementNotes ?? null,
    disbursementReference: input.disbursementReference ?? null,
    id: input.id,
    member:
      input.member ??
      ({
        fullName: "Amina Bello",
        id: "22222222-2222-4222-8222-222222222222",
        memberNumber: "ABC-0123",
      } as const),
    outstandingPrincipal: repayable
      ? Math.max(0, (input.approvedAmount ?? 0) - (input.paidAmount ?? 0))
      : null,
    paidAmount: repayable ? (input.paidAmount ?? 0) : null,
    paidAt: repayable ? (input.paidAt ?? null) : null,
    projectPurpose:
      input.projectPurpose ?? "Expand productive assets and working capacity.",
    proposedStructure:
      input.proposedStructure ?? input.approvedStructure ?? "undecided",
    requestedAmount: input.requestedAmount ?? input.approvedAmount ?? 2_000_000,
    requestedAt: input.requestedAt ?? earlier,
    requestedPaybackMonths:
      input.requestedPaybackMonths ?? (repayable ? 12 : null),
    reviewedAt:
      input.reviewedAt ??
      (input.status === "submitted" || input.status === "under_review"
        ? null
        : earlier),
    reviewedByUser:
      input.reviewedByUser ??
      (input.status === "submitted" || input.status === "under_review"
        ? null
        : {
            fullName: "Committee Reviewer",
            id: "33333333-3333-4333-8333-333333333333",
          }),
    reviewNotes: input.reviewNotes ?? null,
    status: input.status,
    updatedAt: input.updatedAt ?? today,
  }
}

let projects: ProjectFinancingProject[] = [
  project({
    approvedAmount: null,
    approvedStructure: null,
    businessName: "Rahma Tailoring Studio",
    id: "10000000-0000-4000-8000-000000000001",
    proposedStructure: "undecided",
    requestedAmount: 2_400_000,
    requestedPaybackMonths: 18,
    status: "submitted",
  }),
  project({
    approvedAmount: 3_600_000,
    approvedStructure: "repayable_facility",
    businessName: "Northline Cold Store",
    id: "10000000-0000-4000-8000-000000000002",
    reviewNotes: "Principal-only facility approved for twelve months.",
    status: "approved",
  }),
  project({
    approvedAmount: 1_800_000,
    approvedStructure: "investment_partnership",
    businessName: "Safiya Grain Market",
    id: "10000000-0000-4000-8000-000000000003",
    member: {
      fullName: "Safiya Musa",
      id: "22222222-2222-4222-8222-222222222223",
      memberNumber: "ABC-0198",
    },
    reviewNotes: "Partnership terms recorded as governance evidence only.",
    status: "active",
  }),
  project({
    approvedAmount: 2_000_000,
    approvedStructure: "profit_sharing",
    businessName: "Barakah Produce Hub",
    id: "10000000-0000-4000-8000-000000000004",
    member: {
      fullName: "Khadija Bello",
      id: "22222222-2222-4222-8222-222222222224",
      memberNumber: "ABC-0207",
    },
    status: "approved",
  }),
  project({
    approvedAmount: 4_800_000,
    approvedStructure: "repayable_facility",
    businessName: "Ihsan Solar Works",
    disbursedAt: earlier,
    disbursementNotes: "Bank release evidence verified by finance.",
    disbursementReference: "PF-REL-00942",
    id: "10000000-0000-4000-8000-000000000005",
    member: {
      fullName: "Yusuf Ibrahim",
      id: "22222222-2222-4222-8222-222222222225",
      memberNumber: "ABC-0244",
    },
    paidAmount: 1_600_000,
    status: "active",
  }),
  project({
    approvedAmount: 1_200_000,
    approvedStructure: "repayable_facility",
    businessName: "Najah Poultry",
    disbursedAt: earlier,
    disbursementReference: "PF-REL-00818",
    id: "10000000-0000-4000-8000-000000000006",
    paidAmount: 1_200_000,
    paidAt: today,
    status: "completed",
  }),
]

function laneProjects(lane: ProjectFinancingLane) {
  if (lane === "needs_action") {
    return projects.filter((item) => item.attention)
  }
  if (lane === "active") {
    return projects.filter(
      (item) => item.status === "active" && item.disbursedAt
    )
  }
  return projects.filter((item) =>
    (
      ["cancelled", "completed", "rejected"] as ProjectFinancingStatus[]
    ).includes(item.status)
  )
}

export async function getDevProjectFinancingWorkspace(input: {
  cursor?: string
  lane: ProjectFinancingLane
  search?: string
}): Promise<ProjectFinancingWorkspace> {
  const search = input.search?.trim().toLowerCase() ?? ""
  const visible = laneProjects(input.lane).filter((item) =>
    `${item.businessName} ${item.member.fullName} ${item.member.memberNumber}`
      .toLowerCase()
      .includes(search)
  )
  const repayable = projects.filter(
    (item) => item.boundary === "repayable_principal"
  )

  return {
    attention: projects.filter((item) => item.attention).slice(0, 4),
    capabilities: {
      activate: true,
      recordDisbursement: true,
      review: true,
      view: true,
    },
    currencyCode: "NGN",
    generatedAt,
    lane: input.lane,
    nextCursor: null,
    projects: visible,
    summary: {
      blockedCount: projects.filter((item) =>
        ["submitted", "under_review"].includes(item.status)
      ).length,
      closedCount: projects.filter((item) =>
        ["cancelled", "completed", "rejected"].includes(item.status)
      ).length,
      outstandingPrincipal: repayable.reduce(
        (sum, item) => sum + (item.outstandingPrincipal ?? 0),
        0
      ),
      readyCount: projects.filter(
        (item) =>
          item.status === "approved" ||
          (item.status === "active" && !item.disbursedAt)
      ).length,
      totalProjects: projects.length,
    },
    total: visible.length,
  }
}

export async function getDevProjectFinancingDetail(
  projectFinancingRequestId: string
): Promise<ProjectFinancingDetail> {
  const selected =
    projects.find((item) => item.id === projectFinancingRequestId) ??
    projects[0]!
  const repayments =
    selected.boundary === "repayable_principal" &&
    (selected.paidAmount ?? 0) > 0
      ? [
          {
            amount: selected.paidAmount ?? 0,
            id: "40000000-0000-4000-8000-000000000001",
            paidAt: today,
            paymentReference: "RCPT-QA-2041",
            postedAt: today,
          },
        ]
      : []

  return {
    activation:
      selected.status === "active" || selected.status === "completed"
        ? {
            activatedAt: earlier,
            actor: {
              fullName: "Fatima Yusuf",
              id: "11111111-1111-4111-8111-111111111111",
            },
            notes: "Approved structure and accounting boundary verified.",
          }
        : null,
    project: selected,
    repayments,
  }
}

function updateProject(
  id: string,
  updater: (current: ProjectFinancingProject) => ProjectFinancingProject
) {
  projects = projects.map((item) => (item.id === id ? updater(item) : item))
}

export async function runDevProjectFinancingCommand(input: {
  commandId: string
  entityId: string
  state: string
  update?: Partial<ProjectFinancingProject>
}): Promise<ProjectFinancingCommandResult> {
  updateProject(input.entityId, (current) =>
    project({
      ...current,
      ...input.update,
      id: current.id,
      status: input.state as ProjectFinancingStatus,
    })
  )
  return {
    commandId: input.commandId,
    entityId: input.entityId,
    replayed: false,
    state: input.state,
  }
}

export function structureLabel(structure: ProjectFinancingStructure) {
  if (structure === "repayable_facility") return "Repayable facility"
  if (structure === "investment_partnership") return "Investment partnership"
  if (structure === "profit_sharing") return "Profit sharing"
  return "Undecided"
}
