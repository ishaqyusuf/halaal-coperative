import type { MobileReadCacheState } from "@/lib/read-cache"

export type MobileProjectFinancingStructure =
  | "investment_partnership"
  | "profit_sharing"
  | "repayable_facility"
  | "undecided"

export type MobileWorkflowChargeOption = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: string
  id: string
  name: string
}

export type MobileProjectFinancingChargeQuote = {
  chargeQuoteHash: string
  charges: {
    amount: number
    collectionMode: string
    id: string
    name: string
  }[]
  feeTotal: number
  generatedAt: string
  requestedAmount: number
}

export type MobileProjectFinancingRequest = {
  approvedAmount: number | null
  approvedMonthlyPayback: number | null
  approvedPaybackMonths: number | null
  approvedStructure: MobileProjectFinancingStructure | null
  businessDescription: string | null
  businessName: string
  disbursedAt: string | null
  disbursementNotes: string | null
  disbursementReference: string | null
  estimatedMonthlyPayback: number | null
  id: string
  paidAmount: number
  paidAt: string | null
  projectPurpose: string | null
  proposedStructure: MobileProjectFinancingStructure
  requestedAmount: number
  requestedAt: string
  requestedPaybackMonths: number | null
  reviewedAt: string | null
  reviewNotes: string | null
  status: string
}

export type MobileMemberProjectFinancing = {
  cache?: MobileReadCacheState
  canCreateRequest: boolean
  chargeOptions: MobileWorkflowChargeOption[]
  eligibleStructures: {
    requiresPaybackMonths: boolean
    value: MobileProjectFinancingStructure
  }[]
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  requestNextCursor: string | null
  requests: MobileProjectFinancingRequest[]
  restrictionReasons: string[]
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    activeRequests: number
    approvedRequests: number
    outstandingAmount: number
    pendingRequests: number
    totalApprovedAmount: number
    totalRequestedAmount: number
    totalRequests: number
  }
}

export type MobileProjectFinancingRequestPage = {
  data: MobileProjectFinancingRequest[]
  nextCursor: string | null
  state: MobileMemberProjectFinancing["state"]
}

export type MobileProjectFinancingRequestCreateInput = {
  businessDescription?: string
  businessName: string
  chargeQuoteHash: string
  projectPurpose?: string
  proposedStructure?: MobileProjectFinancingStructure
  requestedAmount: number
  requestedPaybackMonths?: number
  submissionKey: string
}
