import type { MobileReadCacheState } from "@/lib/read-cache"

export type AdminFinanceSupportQueueKey =
  | "receipts"
  | "financing"
  | "procurement"
  | "foodPurchase"
  | "projectFinancing"
  | "shares"
  | "collections"
  | "support"

export type AdminFinanceSupportActionKey =
  | "approve"
  | "mark_under_review"
  | "reject"
  | "reply"
  | "review_financial_adjustment"
  | "record_follow_up"
  | "request_correction"
  | "update_support_status"

export type AdminFinanceSupportAction = {
  destructive: boolean
  governanceOnly: boolean
  key: AdminFinanceSupportActionKey
  label: string
  requiresConfirmation: boolean
  requiresEvidence: boolean
}

export type AdminFinanceSupportItem = {
  ageMinutes: number
  allowedActions: AdminFinanceSupportAction[]
  amount: number | null
  blockers: string[]
  details: { label: string; value: string }[]
  financialAdjustmentApprovalStatus: string | null
  id: string
  member: { id: string; name: string; number: string } | null
  policyEvidence: string[]
  queueKey: AdminFinanceSupportQueueKey
  requestedAt: string
  requiresFinancialAdjustment: boolean
  state: string
  displayState?: string
  subtitle: string
  title: string
}

export type AdminFinanceSupportCommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}

export type AdminFinanceSupportCommandBase = {
  commandId: string
  expectedState: string
}

export type FinanceDeskCursor = {
  at: string
  id: string
  queueKey: AdminFinanceSupportQueueKey
}

export type FinanceDeskKey =
  | "financing"
  | "contributions"
  | "repayments"
  | "charges"
  | "procurement"
  | "projectFinancing"
  | "foodPurchase"
  | "shares"

export type FinanceDeskSummary = {
  total: number
  blocked: number
  queueCounts: {
    key: AdminFinanceSupportQueueKey
    count: number
    blocked: number
  }[]
  deskCounts: Record<FinanceDeskKey, number | null>
}

export type FinanceDeskPage = {
  cache?: MobileReadCacheState
  generatedAt: string
  items: AdminFinanceSupportItem[]
  nextCursor: FinanceDeskCursor | null
  summary: FinanceDeskSummary | null
}
