import type {
  CollectionBatchDetail,
  CollectionBatchSummary,
  ContributionCommandResult,
  ContributionLane,
  ContributionMemberWorkspace,
  ContributionWorkspace,
} from "../model/admin-contribution-operations-types"

const generatedAt = "2026-08-30T18:40:00.000Z"
const ledger = [
  {
    amount: 35_000,
    channel: "transfer",
    committedAmount: 25_000,
    extraSavingsAmount: 10_000,
    id: "contribution-dev-1",
    memberId: "member-dev-zainab",
    memberName: "Zainab Musa",
    memberNumber: "HVC-1028",
    periodLabel: "August 2026",
    postedAt: generatedAt,
    reference: "HVC-2026-0829-018",
    status: "posted",
  },
  {
    amount: 50_000,
    channel: "payroll",
    committedAmount: 50_000,
    extraSavingsAmount: 0,
    id: "contribution-dev-2",
    memberId: "member-dev-ibrahim",
    memberName: "Ibrahim Salihu",
    memberNumber: "HVC-1035",
    periodLabel: "August 2026",
    postedAt: "2026-08-29T12:10:00.000Z",
    reference: "HVC-2026-0829-017",
    status: "posted",
  },
  {
    amount: 28_000,
    channel: "manual",
    committedAmount: 20_000,
    extraSavingsAmount: 8_000,
    id: "contribution-dev-3",
    memberId: "member-dev-maryam",
    memberName: "Maryam Bello",
    memberNumber: "HVC-1042",
    periodLabel: "August 2026",
    postedAt: "2026-08-28T10:20:00.000Z",
    reference: "HVC-2026-0828-016",
    status: "pending",
  },
]

const members = [
  {
    activeCommitmentAmount: 25_000,
    activePlanId: "plan-dev-zainab",
    deductionSourceName: "Company payroll",
    id: "member-dev-zainab",
    name: "Zainab Musa",
    number: "HVC-1028",
    paymentAllocationPreference: "savings_first" as const,
    status: "active",
    totalSavings: 410_000,
  },
  {
    activeCommitmentAmount: 50_000,
    activePlanId: "plan-dev-ibrahim",
    deductionSourceName: "Company payroll",
    id: "member-dev-ibrahim",
    name: "Ibrahim Salihu",
    number: "HVC-1035",
    paymentAllocationPreference: "manual_split" as const,
    status: "active",
    totalSavings: 820_000,
  },
  {
    activeCommitmentAmount: 20_000,
    activePlanId: "plan-dev-maryam",
    deductionSourceName: "Agent collection",
    id: "member-dev-maryam",
    name: "Maryam Bello",
    number: "HVC-1042",
    paymentAllocationPreference: "loan_first" as const,
    status: "active",
    totalSavings: 285_000,
  },
]

let batches: CollectionBatchDetail[] = [
  {
    createdAt: "2026-08-29T08:00:00.000Z",
    deductionSource: {
      externalReference: "PAYROLL",
      id: "source-dev-payroll",
      name: "Company payroll",
      type: "payroll",
    },
    id: "batch-dev-payroll-aug",
    notes: null,
    periodLabel: "August 2026",
    periodMonth: 8,
    periodYear: 2026,
    postedAt: null,
    reference: "PAYROLL-AUG-2026",
    rows: [
      {
        blocker: null,
        contributionId: "contribution-dev-2",
        contributionPlanId: "plan-dev-ibrahim",
        exceptionReason: null,
        expectedAmount: 50_000,
        id: "row-dev-1",
        memberId: "member-dev-ibrahim",
        memberName: "Ibrahim Salihu",
        memberNumber: "HVC-1035",
        memberStatus: "active",
        paidAmount: 50_000,
        postedAt: generatedAt,
        status: "posted",
      },
      {
        blocker: null,
        contributionId: null,
        contributionPlanId: "plan-dev-zainab",
        exceptionReason: null,
        expectedAmount: 25_000,
        id: "row-dev-2",
        memberId: "member-dev-zainab",
        memberName: "Zainab Musa",
        memberNumber: "HVC-1028",
        memberStatus: "active",
        paidAmount: 25_000,
        postedAt: null,
        status: "collected",
      },
      {
        blocker: "missing_active_commitment_plan",
        contributionId: null,
        contributionPlanId: null,
        exceptionReason: null,
        expectedAmount: 0,
        id: "row-dev-3",
        memberId: "member-dev-blocked",
        memberName: "Usman Garba",
        memberNumber: "HVC-1138",
        memberStatus: "active",
        paidAmount: 0,
        postedAt: null,
        status: "blocked",
      },
    ],
    status: "partially_posted",
    totals: {
      blockedRows: 1,
      collectedRows: 1,
      exceptionRows: 0,
      expectedAmount: 75_000,
      paidAmount: 75_000,
      postedAmount: 50_000,
      postedRows: 1,
      rowCount: 3,
      skippedRows: 0,
      stagedRows: 0,
    },
  },
]

const sources = [
  { id: "source-dev-payroll", name: "Company payroll", type: "payroll" },
  { id: "source-dev-bank", name: "Bank standing orders", type: "bank" },
  { id: "source-dev-agent", name: "Agent collection", type: "agent" },
]

function command(
  commandId: string,
  entityId: string,
  state: string
): ContributionCommandResult {
  return { commandId, entityId, replayed: false, state }
}

export async function getDevContributionWorkspace(
  lane: ContributionLane,
  search?: string
): Promise<ContributionWorkspace> {
  const rows =
    lane === "ledger" ? ledger : lane === "commitments" ? members : batches
  const query = search?.toLowerCase()
  const data = query
    ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query))
    : rows
  return {
    capabilities: {
      manageBatches: true,
      manageMemberContributions: true,
      view: true,
    },
    currencyCode: "NGN",
    data,
    generatedAt,
    lane,
    nextCursor: null,
    sources: lane === "collections" ? sources : undefined,
    stats: { exceptions: 3, members: 42, postedThisMonth: 1_820_000 },
  }
}

export async function getDevContributionMember(
  memberId: string
): Promise<ContributionMemberWorkspace> {
  const row = members.find((item) => item.id === memberId) ?? members[0]!
  return {
    activeLoan:
      row.id === "member-dev-zainab"
        ? {
            estimatedMonthlyServicing: 10_000,
            id: "loan-dev-zainab",
            outstandingPrincipal: 120_000,
          }
        : null,
    activePlanId: row.activePlanId,
    commitmentTarget: row.activeCommitmentAmount,
    contributionHistory: ledger
      .filter((item) => item.memberId === row.id)
      .map((item) => ({
        amount: item.amount,
        id: item.id,
        postedAt: item.postedAt,
        status: item.status,
      })),
    deductionSourceName: row.deductionSourceName,
    id: row.id,
    name: row.name,
    number: row.number,
    paymentAllocationPreference: row.paymentAllocationPreference,
    planHistory: [
      {
        amount: row.activeCommitmentAmount,
        endsAt: null,
        id: row.activePlanId!,
        isActive: true,
        name: "Monthly commitment",
        startsAt: "2026-08-01T00:00:00.000Z",
      },
      {
        amount: 20_000,
        endsAt: "2026-07-31T00:00:00.000Z",
        id: `old-${row.id}`,
        isActive: false,
        name: "Monthly commitment",
        startsAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    status: row.status,
    totalSavings: row.totalSavings,
    workspaceState: `${row.activePlanId ?? "none"}:${row.id === "member-dev-zainab" ? "loan-dev-zainab" : "none"}`,
  }
}

export async function getDevContributionBatch(batchId: string) {
  return batches.find((item) => item.id === batchId) ?? batches[0]!
}

export async function runDevContributionCommand(input: {
  commandId: string
  entityId: string
  state: string
}) {
  return command(input.commandId, input.entityId, input.state)
}

export async function stageDevContributionBatch(input: {
  commandId: string
  deductionSourceId: string
  month: number
  year: number
}) {
  const source =
    sources.find((item) => item.id === input.deductionSourceId) ?? sources[0]!
  const id = `batch-dev-${source.id}-${input.year}-${input.month}`
  if (!batches.some((item) => item.id === id)) {
    batches = [
      {
        ...batches[0]!,
        createdAt: new Date().toISOString(),
        deductionSource: { ...source, externalReference: null },
        id,
        periodLabel: new Intl.DateTimeFormat("en", {
          month: "long",
          year: "numeric",
        }).format(new Date(input.year, input.month - 1, 1)),
        periodMonth: input.month,
        periodYear: input.year,
        postedAt: null,
        reference: null,
        status: "staged",
      },
      ...batches,
    ]
  }
  return command(input.commandId, id, "staged")
}

export type { CollectionBatchSummary }
