import type { MobileReadCacheState } from "@/lib/read-cache"

export type MobileSupportCategory =
  | "payment_issue"
  | "account_update"
  | "shares"
  | "financing"
  | "procurement"
  | "feature_request"
  | "technical"
  | "other"

export type MobileSupportMessage = {
  attachmentUrl: string | null
  authorName: string | null
  authorType: string
  createdAt: string
  id: string
  message: string
}

export type MobileSupportCase = {
  category: MobileSupportCategory
  detail: string
  financialAdjustmentApprovalStatus: string
  financialAdjustmentApprovalNotes: string | null
  id: string
  lastActivityAt: string
  linkedRecordId: string | null
  linkedRecordType: string | null
  messageCount: number
  moneyImpactRequested: boolean
  recentMessages: MobileSupportMessage[]
  priority: string
  requiresFinancialAdjustment: boolean
  resolutionSummary: string | null
  status: string
  subject: string
}

export type MobileMemberSupport = {
  cache?: MobileReadCacheState
  canCreateCase: boolean
  cases: MobileSupportCase[]
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  nextCursor: string | null
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    highPriorityOpenCases: number
    openCases: number
    totalCases: number
  }
}

export type MobileSupportCreateInput = {
  category: MobileSupportCategory
  description: string
  linkedRecordId?: string
  linkedRecordType?:
    | "member"
    | "contribution"
    | "repayment"
    | "loan_request"
    | "loan"
    | "share_application"
    | "procurement"
    | "receipt"
    | "other"
  moneyImpactRequested?: boolean
  subject: string
}
