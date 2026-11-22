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
  /** Older servers omit it. */
  memberShareApplicationId?: string | null
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
  /** Older servers omit it: proof stays optional. */
  proofRequired?: boolean
  canCreateSupportCase: boolean
  categories: MobileReceiptCategoryOption[]
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  nextCursor: string | null
  receipts: MobilePaymentReceipt[]
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    /** Applied total, ₦ (first page; older servers omit it). */
    appliedAmount?: number
    approvedReceipts: number
    /** Still being checked, ₦ (first page; older servers omit it). */
    checkingAmount?: number
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
  memberShareApplicationId?: string
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

/** What the member owes now (server `listMemberPayables`, T30). */
export type MobileMemberPayableKind =
  | "procurement"
  | "food_purchase"
  | "loan"
  | "shares"
  | "commitment"

export type MobileMemberPayable = {
  amount: number
  /**
   * Badge-picked payments to this item still being checked. Unsplit
   * payments aren't counted until approval. Older servers omit it.
   */
  checkingAmount?: number
  dueDate: string | null
  /** `<kind>:<targetId>`, the `payable` deep-link param. */
  id: string
  kind: MobileMemberPayableKind
  overdue: boolean
  subtitle: string | null
  targetId: string
  title: string
}

export type MobileMemberPayables = {
  cache?: MobileReadCacheState
  canCreateReceipt: boolean
  /** `automatic`: a typed amount is applied in `payables` order. */
  mode: "automatic" | "member_choice"
  /** Already in the cooperative's payment order. */
  payables: MobileMemberPayable[]
  proofRequired: boolean
}
