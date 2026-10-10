import type { MobileReadCacheState } from "@/lib/read-cache"

export type MobileWorkflowChargeOption = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: string
  id: string
  name: string
}

export type MobileProcurementScheduleItem = {
  amount: number
  dueDate: string
  id: string
  installmentNumber: number
  paidAmount: number
  status: string
}

export type MobileMemberProcurementRequest = {
  approvedCost: number | null
  approvedMonthlyRepayment: number | null
  approvedRepaymentMonths: number | null
  estimatedMonthlyRepayment: number
  id: string
  itemDescription: string | null
  itemName: string
  outstandingAmount: number
  purchasedAt: string | null
  purchaseReference: string | null
  requestedAt: string
  requestedCost: number
  requestedRepaymentMonths: number
  reviewNotes: string | null
  scheduleItems: MobileProcurementScheduleItem[]
  status: string
  vendorName: string | null
}

export type MobileMemberProcurement = {
  cache?: MobileReadCacheState
  canCreateRequest: boolean
  capability: {
    accessMode: "disabled" | "office_only" | "member_self_service" | "read_only"
    canMemberCreate: boolean
    canSettleExisting: boolean
    canStaffCreate: boolean
    canViewExisting: boolean
    serviceKey: "procurement"
    shouldShowInMemberNav: boolean
    shouldShowInStaffNav: boolean
  }
  chargeOptions: MobileWorkflowChargeOption[]
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  policy: {
    activeFinancingBlocksProcurement: boolean
    allowsCommitmentReductionDuringPayback: boolean
    maximumActiveObligationsPerMember: number
    maximumPaybackMonths: number
  }
  requestNextCursor: string | null
  requests: MobileMemberProcurementRequest[]
  restrictionReasons: string[]
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    activeRequests: number
    approvedRequests: number
    dueScheduleItems: number
    outstandingAmount: number
    overdueScheduleItems: number
    pendingRequests: number
    totalRequests: number
  }
}

export type MobileProcurementRequestPage = {
  data: MobileMemberProcurementRequest[]
  nextCursor: string | null
  state: MobileMemberProcurement["state"]
}

export type MobileProcurementRequestCreateInput = {
  itemDescription?: string
  itemName: string
  requestedCost: number
  requestedRepaymentMonths: number
  submissionKey: string
  vendorName?: string
}
