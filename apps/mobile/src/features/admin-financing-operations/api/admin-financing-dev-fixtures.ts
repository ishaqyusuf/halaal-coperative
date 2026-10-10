import type {
  FinancingCommandResult,
  FinancingItem,
  FinancingLane,
  FinancingWorkspace,
} from "../model/admin-financing-operations-types"

const generatedAt = "2026-08-30T06:30:00.000Z"

const requestItems: FinancingItem[] = [
  {
    actions: ["review"],
    amount: 300_000,
    approvals: [
      {
        actedAt: "2026-08-28T08:20:00.000Z",
        actorName: "Patsy Cummerata",
        action: "approved",
        id: "approval-aisha-1",
        notes: "Eligibility and guarantor evidence reviewed.",
      },
    ],
    blockers: [],
    evidence: [
      "2 of 2 guarantors approved",
      "1 finance approval remaining",
      "Eligibility snapshot 600000",
      "Pool snapshot 2400000",
    ],
    id: "6a6ab8d7-40a0-4e64-8504-e8a4cc7c0001",
    kind: "request",
    loanId: null,
    loanType: "normal",
    member: {
      id: "member-dev-aisha",
      name: "Amina Yusuf",
      number: "HVC-QA-0041",
    },
    productName: "Normal financing",
    requestedAt: "2026-08-28T08:00:00.000Z",
    state: "under_review",
    termMonths: 12,
  },
  {
    actions: ["review"],
    amount: 200_000,
    approvals: [],
    blockers: ["1 guarantor response remains."],
    evidence: [
      "1 of 2 guarantors approved",
      "2 finance approvals remaining",
      "Eligibility snapshot 450000",
      "Pool snapshot 2400000",
    ],
    id: "6a6ab8d7-40a0-4e64-8504-e8a4cc7c0002",
    kind: "request",
    loanId: null,
    loanType: "quick",
    member: {
      id: "member-dev-maryam",
      name: "Maryam Bello",
      number: "HVC-QA-0044",
    },
    productName: "Quick financing",
    requestedAt: "2026-08-29T11:00:00.000Z",
    state: "submitted",
    termMonths: 6,
  },
]

const disbursementItems: FinancingItem[] = [
  {
    actions: ["disburse"],
    amount: 250_000,
    approvals: [
      {
        actedAt: "2026-08-29T08:00:00.000Z",
        actorName: "Finance Officer One",
        action: "approved",
        id: "approval-chinedu-1",
        notes: "First approval complete.",
      },
      {
        actedAt: "2026-08-29T09:00:00.000Z",
        actorName: "Finance Officer Two",
        action: "approved",
        id: "approval-chinedu-2",
        notes: "Second approval complete.",
      },
    ],
    blockers: [],
    evidence: [
      "Approval reserves cycle capacity but does not guarantee disbursement.",
      "Fresh deployable-funds check: 650000 available for this release.",
      "2 guarantor approvals recorded.",
    ],
    id: "7b7ab8d7-40a0-4e64-8504-e8a4cc7c0001",
    kind: "loan",
    loanId: "7b7ab8d7-40a0-4e64-8504-e8a4cc7c0001",
    loanType: "normal",
    member: {
      id: "member-dev-chinedu",
      name: "Chinedu Okafor",
      number: "HVC-QA-0038",
    },
    productName: "Normal financing",
    requestedAt: "2026-08-24T08:00:00.000Z",
    state: "approved",
    termMonths: 12,
  },
  {
    actions: ["disburse"],
    amount: 200_000,
    approvals: [],
    blockers: ["Deployable funds available for this release are 150000."],
    evidence: [
      "Approval reserves cycle capacity but does not guarantee disbursement.",
      "Fresh deployable-funds check: 150000 available for this release.",
      "1 guarantor approval recorded.",
    ],
    id: "7b7ab8d7-40a0-4e64-8504-e8a4cc7c0002",
    kind: "loan",
    loanId: "7b7ab8d7-40a0-4e64-8504-e8a4cc7c0002",
    loanType: "quick",
    member: {
      id: "member-dev-fatima",
      name: "Fatima Lawal",
      number: "HVC-QA-0040",
    },
    productName: "Quick financing",
    requestedAt: "2026-08-25T10:00:00.000Z",
    state: "approved",
    termMonths: 3,
  },
]

export async function getDevFinancingWorkspace(
  lane: FinancingLane,
  search?: string
): Promise<FinancingWorkspace> {
  const source =
    lane === "review"
      ? requestItems
      : lane === "disbursement"
        ? disbursementItems
        : [...requestItems, ...disbursementItems].map((item) => ({
            ...item,
            actions: [] as FinancingItem["actions"],
          }))
  const query = search?.trim().toLowerCase()
  const items = query
    ? source.filter((item) =>
        `${item.member.name} ${item.member.number} ${item.productName}`
          .toLowerCase()
          .includes(query)
      )
    : source
  return {
    capabilities: {
      disburse: true,
      manageCycle: true,
      review: true,
      view: true,
    },
    currencyCode: "NGN",
    cycle: {
      collectionCoverage: 0.75,
      deployableFunds: {
        approvedHoldAmount: 450_000,
        deployableFunds: 400_000,
        outstandingFinancingAmount: 300_000,
        reserveBufferAmount: 240_000,
        totalContributionAmount: 1_390_000,
      },
      id: "9c9ab8d7-40a0-4e64-8504-e8a4cc7c0001",
      intakeStatus: "open",
      normal: {
        approvedAmount: 550_000,
        budgetAmount: 1_512_000,
        disbursedAmount: 300_000,
        heldAmount: 250_000,
        remainingAmount: 662_000,
        requestedReservedAmount: 850_000,
      },
      normalAllocationPercentage: 70,
      periodEnd: "2026-08-31T00:00:00.000Z",
      periodStart: "2026-08-01T00:00:00.000Z",
      projectedCommitmentAmount: 2_400_000,
      quick: {
        approvedAmount: 200_000,
        budgetAmount: 648_000,
        disbursedAmount: 0,
        heldAmount: 200_000,
        remainingAmount: 348_000,
        requestedReservedAmount: 300_000,
      },
      quickAllocationPercentage: 30,
      receivedContributionAmount: 1_800_000,
      reserveBufferAmount: 240_000,
      status: "open",
      totalCapacityAmount: 2_160_000,
      warnings: [
        {
          key: "collections_below_projected",
          label: "Actual collections are below projected commitments",
          severity: "warning",
        },
      ],
    },
    generatedAt,
    items,
    lane,
    stats: {
      blocked: items.filter((item) => item.blockers.length).length,
      count: items.length,
      totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
    },
  }
}

export async function runDevFinancingCommand(
  commandId: string,
  entityId: string,
  state: string
): Promise<FinancingCommandResult> {
  return { commandId, entityId, replayed: false, state }
}
