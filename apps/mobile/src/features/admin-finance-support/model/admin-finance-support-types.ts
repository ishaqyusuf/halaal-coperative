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
  details: Array<{ label: string; value: string }>
  financialAdjustmentApprovalStatus: string | null
  id: string
  member: { id: string; name: string; number: string } | null
  policyEvidence: string[]
  queueKey: AdminFinanceSupportQueueKey
  requestedAt: string
  requiresFinancialAdjustment: boolean
  state: string
  subtitle: string
  title: string
}

export type AdminFinanceSupportOverview = {
  cache?: MobileReadCacheState
  capabilities: {
    approveMoneyImpactSupport: boolean
    manageSupport: boolean
    recordCollectionFollowUp: boolean
    reviewFinancing: boolean
    reviewFoodPurchase: boolean
    reviewProcurement: boolean
    reviewProjectFinancing: boolean
    reviewReceipts: boolean
    reviewShares: boolean
  }
  generatedAt: string
  items: AdminFinanceSupportItem[]
  queueCounts: Array<{
    count: number
    key: AdminFinanceSupportQueueKey
    label: string
  }>
  state: "database_unavailable" | "ready"
  stats: Array<{
    format: "count" | "currency" | "percent"
    key: string
    label: string
    value: number
  }>
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
