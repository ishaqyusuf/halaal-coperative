export type ShareProfitBook = "profit" | "shares"

export type ShareProfitQaState =
  | "denied"
  | "empty"
  | "error"
  | "monthly"
  | "offline"
  | "stale"

export type ShareProfitCapabilities = {
  approveProfit: boolean
  publishProfit: boolean
  reviewShares: boolean
  view: boolean
}

export type ShareApplication = {
  allowedActions: readonly "review"[]
  approvedUnits: number | null
  createdAt: string
  id: string
  memberEmail: string | null
  memberId: string
  memberName: string
  memberNumber: string
  notes: string | null
  requestedByUserId: string | null
  requestedUnits: number
  reviewedAt: string | null
  reviewedByUserId: string | null
  reviewNotes: string | null
  shareValueSnapshot: number
  status: "approved" | "cancelled" | "pending" | "rejected"
  unitAmountSnapshot: number
}

export type ShareLedgerRow = {
  amount: number
  createdAt: string
  effectiveDate: string
  id: string
  member: { fullName: string; id: string; memberNumber: string }
  notes: string | null
  sourceType: string
}

export type SharePolicy = {
  configurationMode: "monthly_history" | "unit_based"
  compulsoryShareUnits: number
  id: string | null
  maximumShareUnits: number
  unitAmount: number
}

export type ShareStats = {
  ledgerCount: number
  pendingCount: number
  pendingUnits: number
  postedCapital: number
}

export type ShareWorkspace = {
  applications: ShareApplication[]
  ledger: ShareLedgerRow[]
  nextCursor: string | null
  policy: SharePolicy
  /** Only on older-build pages; current builds read ShareProfitSummary. */
  summary?: ShareStats
  total: number
}

export type ProfitEntryAction = "approve" | "publish"

export type ProfitEntry = {
  allocatedAmount: number
  allocationCount: number
  allocationsReconcile: boolean
  allowedActions: ProfitEntryAction[]
  allocatableProfit: number
  blocker: string | null
  businessName: string
  expenseAmount: number
  id: string
  profitAmount: number
  profitDate: string
  publishedAllocationCount: number
  reason: string | null
  sourceType: string
  status:
    | "approved"
    | "archived"
    | "completed"
    | "draft"
    | "pending"
    | "reviewed"
}

export type ProfitPeriod = {
  allocationCount: number
  deductionAmount: number
  deductionReason: string | null
  distributableAmount: number
  entries: ProfitEntry[]
  entryExpenseAmount: number
  grossProfitAmount: number
  id: string
  name: string
  pendingApprovalCount: number
  periodEnd: string
  periodStart: string
  publishedAt: string | null
  readyToPublishCount: number
  status: "approved" | "closed" | "draft" | "published"
}

export type ProfitStats = {
  pendingApprovalCount: number
  readyToPublishCount: number
  unpublishedAmount: number
}

export type ProfitWorkspace = {
  nextCursor: string | null
  periods: ProfitPeriod[]
  summary?: ProfitStats
  total: number | null
}

export type ReadCache = {
  ageMs: number
  cachedAt: string
  scope: string
  status: "live" | "stale"
}

/** One cursor page of a book (current builds send includeSummary: false). */
export type ShareProfitWorkspace = {
  book: ShareProfitBook
  cache?: ReadCache
  capabilities: ShareProfitCapabilities
  currencyCode?: string
  generatedAt: string
  profit: ProfitWorkspace | null
  shares: ShareWorkspace | null
}

/** Both books' header stats, policy and currency: read once per visit. */
export type ShareProfitSummary = {
  cache?: ReadCache
  capabilities: ShareProfitCapabilities
  currencyCode: string
  generatedAt: string
  policy: SharePolicy
  profit: ProfitStats
  shares: ShareStats
}

export type ShareApplicationDetail = {
  application: ShareApplication
  cache?: ReadCache
  policy: SharePolicy
  position: {
    approvedOptionalUnits: number
    compulsoryUnits: number
    maximumUnits: number
    pendingOptionalUnits: number
    totalApprovedUnits: number
    totalApprovedValue: number
    totalPendingUnits: number
    totalPendingValue: number
    unitAmount: number
  } | null
  postedLedger: {
    amount: number
    effectiveDate: string
    id: string
  } | null
}

export type ProfitPeriodDetail = {
  cache?: ReadCache
  period: ProfitPeriod
  periodAllocations: {
    allocationAmount: number
    id: string
    member: { fullName: string; id: string; memberNumber: string }
    savingsBasisAmount: number
  }[]
  profitEntries: (ProfitEntry & {
    allocations: {
      allocatedProfitAmount: number
      id: string
      member: { fullName: string; id: string; memberNumber: string }
      memberShareBalance: number
      sharePercentage: number
      status: "cancelled" | "draft" | "published"
    }[]
    expenseLines: { amount: number; id: string; reason: string }[]
  })[]
}

export type ShareProfitCommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}
