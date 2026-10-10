export type ProjectFinancingLane = "active" | "closed" | "needs_action"

export type ProjectFinancingOperationsQaState =
  | "denied"
  | "empty"
  | "error"
  | "offline"
  | "stale"

export type ProjectFinancingStructure =
  | "investment_partnership"
  | "profit_sharing"
  | "repayable_facility"
  | "undecided"

export type ProjectFinancingStatus =
  | "active"
  | "approved"
  | "cancelled"
  | "completed"
  | "rejected"
  | "submitted"
  | "under_review"

export type ProjectFinancingCapabilities = {
  activate: boolean
  recordDisbursement: boolean
  review: boolean
  view: boolean
}

export type ProjectFinancingAction =
  | "activate"
  | "record_disbursement"
  | "review"

export type ProjectFinancingProject = {
  allowedActions: ProjectFinancingAction[]
  approvedAmount: number | null
  approvedMonthlyPayback: number | null
  approvedPaybackMonths: number | null
  approvedStructure: ProjectFinancingStructure | null
  attention: {
    label: string
    severity: "blocked" | "ready" | "warning"
  } | null
  boundary: "evidence_only" | "repayable_principal"
  businessDescription: string | null
  businessName: string
  disbursedAt: string | null
  disbursedByUser: { fullName: string; id: string } | null
  disbursementNotes: string | null
  disbursementReference: string | null
  id: string
  member: { fullName: string; id: string; memberNumber: string }
  outstandingPrincipal: number | null
  paidAmount: number | null
  paidAt: string | null
  projectPurpose: string | null
  proposedStructure: ProjectFinancingStructure
  requestedAmount: number
  requestedAt: string
  requestedPaybackMonths: number | null
  reviewedAt: string | null
  reviewedByUser: { fullName: string; id: string } | null
  reviewNotes: string | null
  status: ProjectFinancingStatus
  updatedAt: string
}

export type ProjectFinancingWorkspace = {
  attention: ProjectFinancingProject[]
  capabilities: ProjectFinancingCapabilities
  currencyCode: string
  generatedAt: string
  lane: ProjectFinancingLane
  nextCursor: string | null
  projects: ProjectFinancingProject[]
  summary: {
    blockedCount: number
    closedCount: number
    outstandingPrincipal: number
    readyCount: number
    totalProjects: number
  }
  total: number
}

export type ProjectFinancingDetail = {
  activation: {
    activatedAt: string
    actor: { fullName: string; id: string } | null
    notes: string | null
  } | null
  project: ProjectFinancingProject
  repayments: {
    amount: number
    id: string
    paidAt: string
    paymentReference: string | null
    postedAt: string
  }[]
}

export type ProjectFinancingCommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}
