import type { MobileReadCacheState } from "@/lib/read-cache"
import type { MobileMemberSection } from "@/features/member-core/public/member-core-types"

export type MobileFinancingProduct = {
  code: string | null
  id: string
  loanType: string
  maxSavingsMultiple: number
  name: string
  termMonths: number
}

export type MobileFinancingRequest = {
  availablePoolSnapshot: number
  charges: {
    amount: number
    code: string
    collectionMode: string
    id: string
    name: string
    status: string
  }[]
  eligibleAmountSnapshot: number
  estimatedMonthlyServicing: number
  extraMonthlySavingsAmount: number
  guarantorApprovals: {
    guarantorMemberNumber: string
    guarantorName: string
    id: string
    respondedAt: string | null
    status: string
  }[]
  id: string
  loanProductCode: string | null
  loanProductName: string
  purpose: string | null
  requestedAmount: number
  requestedAt: string
  requestedTermMonths: number
  reviewNotes: string | null
  status: string
}

export type MobileMemberFinancing = {
  cache?: MobileReadCacheState
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  products: MobileFinancingProduct[]
  requestNextCursor: string | null
  requests: MobileFinancingRequest[]
  section: MobileMemberSection
  state: "available" | "database_unavailable" | "member_profile_missing"
}

export type MobileFinancingRequestInput = {
  chargeQuoteHash: string
  extraMonthlySavingsAmount?: number
  loanProductId: string
  purpose?: string
  requestedAmount: number
  requestedTermMonths: number
}

export type MobileFinancingQuoteInput = Omit<
  MobileFinancingRequestInput,
  "purpose" | "chargeQuoteHash"
>

export type MobileFinancingQuote = {
  availablePool: number
  blockers: { key: string; message: string }[]
  canSubmit: boolean
  capacityRemaining: number
  charges: {
    amount: number
    chargeValueType: "fixed_amount" | "percentage"
    code: string
    collectionMode: string
    id: string
    isRequired: boolean
    name: string
  }[]
  chargeQuoteHash: string
  deployableFunds: number
  eligibleAmount: number
  eligibilitySavingsBase: number
  estimatedMonthlyServicing: number
  feeTotal: number
  generatedAt: string
  product: MobileFinancingProduct
  requestedAmount: number
  requestedTermMonths: number
  specialSavingsCountsForEligibility: boolean
  warnings: { key: string; message: string }[]
}

export type MobileFinancingRequestPage = {
  data: MobileFinancingRequest[]
  nextCursor: string | null
  state: "available" | "database_unavailable" | "member_profile_missing"
}
