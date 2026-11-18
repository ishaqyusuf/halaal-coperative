export type FinancingLane = "activity" | "disbursement" | "review"
export type FinancingCycleState = "closed" | "draft" | "missing" | "open" | "paused"
export type FinancingAction = "disburse" | "review"

export type FinancingCapabilities = {
  disburse: boolean
  manageCycle: boolean
  review: boolean
  view: boolean
}

export type FinancingItem = {
  actions: FinancingAction[]
  amount: number
  approvals: {
    actedAt: string
    actorName: string
    action: string
    id: string
    notes: string | null
  }[]
  blockers: string[]
  evidence: string[]
  id: string
  kind: "loan" | "request"
  loanId: string | null
  loanType: "normal" | "quick"
  member: {
    id: string
    name: string
    number: string
  }
  productName: string
  requestedAt: string
  state: string
  termMonths: number
}

export type FinancingUsage = {
  approvedAmount: number
  budgetAmount: number
  disbursedAmount: number
  heldAmount: number
  remainingAmount: number
  requestedReservedAmount: number
}

export type ReadCache = {
  ageMs: number
  cachedAt: string
  scope: string
  status: "live" | "stale"
}

export type FinancingCycle = {
  collectionCoverage: number
  deployableFunds: {
    approvedHoldAmount: number
    deployableFunds: number
    outstandingFinancingAmount: number
    reserveBufferAmount: number
    totalContributionAmount: number
  }
  id: string | null
  intakeStatus: "closed" | "missing" | "open" | "paused"
  normal: FinancingUsage
  normalAllocationPercentage: number
  periodEnd: string
  periodStart: string
  projectedCommitmentAmount: number
  quick: FinancingUsage
  quickAllocationPercentage: number
  receivedContributionAmount: number
  reserveBufferAmount: number
  status: Exclude<FinancingCycleState, "missing"> | null
  totalCapacityAmount: number
  warnings: {
    key: string
    label: string
    severity: "critical" | "warning"
  }[]
}

/** Read once per visit: cycle, currency, lane counts, approval policy. */
export type FinancingSummary = {
  cache?: ReadCache
  capabilities: FinancingCapabilities
  currencyCode: string
  cycle: FinancingCycle
  generatedAt: string
  lanes: Record<
    Exclude<FinancingLane, "activity">,
    { count: number; totalAmount: number }
  >
  requiresDualApproval: boolean
}

/** One cursor page of a lane (current builds send includeSummary: false). */
export type FinancingWorkspace = {
  cache?: ReadCache
  capabilities: FinancingCapabilities
  generatedAt: string
  items: FinancingItem[]
  lane: FinancingLane
  nextCursor?: string | null
  stats: {
    blocked: number
    count: number
    totalAmount: number
  }
}

export type FinancingItemRead = {
  cache?: ReadCache
  item: FinancingItem
  lane: FinancingLane
}

export type FinancingCommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}
