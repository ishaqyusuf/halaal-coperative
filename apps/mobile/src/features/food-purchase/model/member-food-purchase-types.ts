import type { MobileReadCacheState } from "@/lib/read-cache"

export type MobileWorkflowChargeOption = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: string
  id: string
  name: string
}

export type MobileFoodPurchaseCycle = {
  id: string
  periodMonth: string
  releasedAmount: number
  releasedAt: string
  releaseNotes: string | null
  status: string
}

export type MobileFoodPurchaseApplication = {
  approvedAmount: number | null
  approvedPaybackMonths: number | null
  cycle: {
    id: string
    periodMonth: string
    releasedAmount: number
    status: string
  }
  id: string
  itemDescription: string | null
  paidAmount: number
  paidAt: string | null
  requestedAmount: number
  requestedAt: string
  requestedPaybackMonths: number
  requestNotes: string | null
  reviewNotes: string | null
  status: string
}

export type MobileMemberFoodPurchase = {
  applicationNextCursor: string | null
  applications: MobileFoodPurchaseApplication[]
  cache?: MobileReadCacheState
  canCreateApplication: boolean
  capability: {
    accessMode: "disabled" | "office_only" | "member_self_service" | "read_only"
    canMemberCreate: boolean
    canSettleExisting: boolean
    canStaffCreate: boolean
    canViewExisting: boolean
    serviceKey: "food_purchase"
    shouldShowInMemberNav: boolean
    shouldShowInStaffNav: boolean
  }
  chargeOptions: MobileWorkflowChargeOption[]
  cycles: MobileFoodPurchaseCycle[]
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  policy: {
    allowsCommitmentReductionDuringPayback: boolean
    maximumActiveObligationsPerMember: number
    maximumPaybackMonths: number
    requiresOpenCycle: boolean
  }
  restrictionReasons: string[]
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    approvedApplications: number
    openCycles: number
    pendingApplications: number
    totalApplications: number
  }
}

export type MobileFoodPurchaseApplicationPage = {
  data: MobileFoodPurchaseApplication[]
  nextCursor: string | null
  state: MobileMemberFoodPurchase["state"]
}

export type MobileFoodPurchaseApplicationCreateInput = {
  cycleId: string
  itemDescription?: string
  requestedAmount: number
  requestedPaybackMonths: number
  requestNotes?: string
  submissionKey: string
}
