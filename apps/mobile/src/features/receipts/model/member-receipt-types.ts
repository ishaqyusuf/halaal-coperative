import type { MobileReadCacheState } from "@/lib/read-cache"

export type MobileReceiptAllocationCategory =
  | "commitment"
  | "special_savings"
  | "loan_servicing"
  | "loan_extra_payment"
  | "shares"
  | "procurement"
  | "project_financing"
  | "food_purchase"
  | "other"

export type MobileReceiptPeriodIntent =
  | "current_period"
  | "future_period"
  | "back_period"
  | "unspecified"

export type MobileReceiptChannel = "cash" | "transfer" | "manual" | "payroll"

export type MobileReceiptTargetKind =
  | "contributionPlanId"
  | "foodPurchaseApplicationId"
  | "loanId"
  | "projectFinancingRequestId"
  | "procurementRepaymentScheduleItemId"
  | null

export type MobileReceiptTargetOption = {
  id: string
  label: string
  outstandingAmount: number | null
}

export type MobileReceiptCategoryOption = {
  label: string
  postable: boolean
  requiresTarget: boolean
  targetKind: MobileReceiptTargetKind
  targets: MobileReceiptTargetOption[]
  value: MobileReceiptAllocationCategory
}

export type MobileReceiptAllocation = {
  amount: number
  category: MobileReceiptAllocationCategory
  contributionPlanId: string | null
  foodPurchaseApplicationId: string | null
  id: string
  loanId: string | null
  notes: string | null
  periodIntent: MobileReceiptPeriodIntent
  projectFinancingRequestId: string | null
  procurementRepaymentScheduleItemId: string | null
  targetPeriodStart: string | null
}

export type MobilePaymentReceipt = {
  allocations: MobileReceiptAllocation[]
  channel: MobileReceiptChannel
  id: string
  memberNotes: string | null
  paidAt: string
  paymentReference: string | null
  proofDocumentName: string | null
  proofDocumentUrl: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  status: string
  submittedAt: string
  totalAmount: number
}

export type MobileMemberReceipts = {
  cache?: MobileReadCacheState
  canCreateReceipt: boolean
  canCreateSupportCase: boolean
  categories: MobileReceiptCategoryOption[]
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  nextCursor: string | null
  receipts: MobilePaymentReceipt[]
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    approvedReceipts: number
    correctionRequestedReceipts: number
    pendingReviewReceipts: number
    rejectedReceipts: number
  }
}

export type MobileReceiptCreateAllocation = {
  amount: number
  category: MobileReceiptAllocationCategory
  contributionPlanId?: string
  foodPurchaseApplicationId?: string
  loanId?: string
  notes?: string
  periodIntent?: MobileReceiptPeriodIntent
  projectFinancingRequestId?: string
  procurementRepaymentScheduleItemId?: string
  targetPeriodStart?: string
}

export type MobileReceiptCreateInput = {
  allocations: MobileReceiptCreateAllocation[]
  channel?: MobileReceiptChannel
  memberNotes?: string
  paidAt: string
  paymentReference?: string
  proofDocumentName?: string
  proofDocumentUrl?: string
  totalAmount: number
}
