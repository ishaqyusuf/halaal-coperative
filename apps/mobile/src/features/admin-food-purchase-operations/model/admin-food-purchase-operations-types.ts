export type FoodPurchaseLane = "accounting" | "applications" | "history"

export type FoodPurchaseCycleStatus =
  | "accounting_approved"
  | "accounting_rejected"
  | "accounting_submitted"
  | "cancelled"
  | "closed"
  | "completed"
  | "draft"
  | "intake_closed"
  | "open"

export type FoodPurchaseCapabilities = {
  releaseFunds: boolean
  reviewAccounting: boolean
  reviewApplications: boolean
  submitAccounting: boolean
  view: boolean
}

export type FoodPurchaseCycle = {
  accountingNotes: string | null
  accountingSubmittedAt: string | null
  accountingSubmittedByUser: { fullName: string; id: string } | null
  accountingSubmittedByUserId: string | null
  createdAt: string
  id: string
  operatingExpenseAmount: number | null
  periodMonth: string
  profitAmount: number | null
  purchaseCostAmount: number | null
  releasedAmount: number
  releasedAt: string
  releasedByUser: { fullName: string; id: string }
  releasedByUserId: string
  releaseNotes: string | null
  salesAmount: number | null
  status: FoodPurchaseCycleStatus
  updatedAt: string
}

export type FoodPurchaseApplication = {
  approvedAmount: number | null
  approvedPaybackMonths: number | null
  allowsCommitmentReductionDuringPayback: boolean
  cycle: {
    id: string
    periodMonth: string
    releasedAmount: number
    status: FoodPurchaseCycleStatus
  }
  cycleId: string
  id: string
  itemDescription: string | null
  member: { fullName: string; id: string; memberNumber: string }
  outstandingAmount: number
  paidAmount: number
  paidAt: string | null
  policyMaximumPaybackMonths: number
  requestedAmount: number
  requestedAt: string
  requestedPaybackMonths: number
  requestNotes: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  status: "approved" | "cancelled" | "rejected" | "submitted" | "under_review"
}

type FoodPurchaseReadCache = {
  ageMs: number
  cachedAt: string
  scope: string
  status: "live" | "stale"
}

export type FoodPurchaseCycleSummary = {
  approvedAmount: number
  allocationShortfallAmount: number
  availableAmount: number
  outstandingAmount: number
  paidAmount: number
  pendingApplications: number
  requestedAmount: number
  totalApplications: number
}

/** Cycles plus the selected cycle's totals (the legacy full workspace). */
export type FoodPurchaseWorkspace = {
  applications: FoodPurchaseApplication[]
  cache?: FoodPurchaseReadCache
  capabilities: FoodPurchaseCapabilities
  currencyCode: string
  cycles: FoodPurchaseCycle[]
  generatedAt: string
  lane: FoodPurchaseLane
  nextApplicationCursor: string | null
  selectedCycle: FoodPurchaseCycle | null
  summary: FoodPurchaseCycleSummary
}

/** One applications page for a cycle (T21 lean read). */
export type FoodPurchaseApplicationPage = {
  applications: FoodPurchaseApplication[]
  cache?: FoodPurchaseReadCache
  capabilities: FoodPurchaseCapabilities
  currencyCode: string
  generatedAt: string
  lane: FoodPurchaseLane
  nextApplicationCursor: string | null
  nextCursor?: string | null
  total?: number
}

export type FoodPurchaseCommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}
