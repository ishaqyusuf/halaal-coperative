export type ContributionLane = "ledger" | "commitments" | "collections"
export type AllocationPreference =
  | "manual_split"
  | "savings_first"
  | "loan_first"

export type ContributionCapabilities = {
  manageBatches: boolean
  manageMemberContributions: boolean
  view: boolean
}

export type ContributionStats = {
  exceptions: number
  members: number
  postedThisMonth: number
}

export type ContributionLedgerRow = {
  amount: number
  channel: string
  committedAmount: number
  extraSavingsAmount: number
  id: string
  memberId: string
  memberName: string
  memberNumber: string
  periodLabel: string | null
  postedAt: string
  reference: string | null
  status: string
}

export type ContributionMemberRow = {
  activeCommitmentAmount: number
  activePlanId: string | null
  deductionSourceName: string | null
  id: string
  name: string
  number: string
  paymentAllocationPreference: AllocationPreference
  status: string
  totalSavings: number
}

export type CollectionBatchTotals = {
  blockedRows: number
  collectedRows: number
  exceptionRows: number
  expectedAmount: number
  paidAmount: number
  postedAmount: number
  postedRows: number
  rowCount: number
  skippedRows: number
  stagedRows: number
}

export type CollectionBatchSummary = {
  createdAt: string
  deductionSource: {
    externalReference: string | null
    id: string
    name: string
    type: string
  }
  id: string
  notes: string | null
  periodLabel: string
  periodMonth: number
  periodYear: number
  postedAt: string | null
  reference: string | null
  status: string
  totals: CollectionBatchTotals
}

export type CollectionSource = { id: string; name: string; type: string }

export type ContributionWorkspace = {
  cache?: {
    ageMs: number
    cachedAt: string
    scope: string
    status: "live" | "stale"
  }
  capabilities: ContributionCapabilities
  currencyCode: string
  data: (
    | ContributionLedgerRow
    | ContributionMemberRow
    | CollectionBatchSummary
  )[]
  generatedAt: string
  lane: ContributionLane
  nextCursor: string | null
  sources?: CollectionSource[]
  stats: ContributionStats
}

export type ContributionMemberWorkspace = {
  activeLoan: {
    estimatedMonthlyServicing: number
    id: string
    outstandingPrincipal: number
  } | null
  activePlanId: string | null
  commitmentTarget: number
  contributionHistory: {
    amount: number
    id: string
    postedAt: string
    status: string
  }[]
  deductionSourceName: string | null
  id: string
  name: string
  number: string
  paymentAllocationPreference: AllocationPreference
  planHistory: {
    amount: number
    endsAt: string | null
    id: string
    isActive: boolean
    name: string
    startsAt: string
  }[]
  status: string
  totalSavings: number
  workspaceState: string
}

export type CollectionBatchRow = {
  blocker: string | null
  contributionId: string | null
  contributionPlanId: string | null
  exceptionReason: string | null
  expectedAmount: number
  id: string
  memberId: string
  memberName: string
  memberNumber: string
  memberStatus: string
  paidAmount: number
  postedAt: string | null
  status: string
}

export type CollectionBatchDetail = CollectionBatchSummary & {
  rows: CollectionBatchRow[]
}

export type ContributionCommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}

export type ContributionCommandBase = {
  commandId: string
  expectedState: string
}
