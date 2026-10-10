import type { MobileReadCacheState } from "@/lib/read-cache"

export const operationProfileAccessModes = [
  "disabled",
  "office_only",
  "member_self_service",
  "read_only",
] as const

export type OperationProfileAccessMode =
  (typeof operationProfileAccessModes)[number]

export const operationProfileServiceKeys = [
  "payment_receipts",
  "procurement",
  "food_purchase",
  "support_cases",
  "collection_sources",
  "collection_source_batch_posting",
] as const

export type OperationProfileServiceKey =
  (typeof operationProfileServiceKeys)[number]

export type MobileOperationProfileService = {
  accessMode: OperationProfileAccessMode
  canMemberCreate: boolean
  canSettleExisting: boolean
  canStaffCreate: boolean
  canViewExisting: boolean
  effectiveAccessMode: OperationProfileAccessMode
  effectiveCanMemberCreate: boolean
  effectiveCanStaffCreate: boolean
  serviceKey: OperationProfileServiceKey
  shouldShowInMemberNav: boolean
  shouldShowInStaffNav: boolean
}

export type MobileOperationProfileSnapshot = {
  cache?: MobileReadCacheState
  policy: {
    foodPurchaseMaximumActiveObligationsPerMember: number
    foodPurchaseRequiresOpenCycle: boolean
    procurementMaximumActiveObligationsPerMember: number
  }
  reviewedAt: string | null
  reviewedByUserId: string | null
  services: MobileOperationProfileService[]
  subscription: {
    accessEnabled: boolean
    planCode: string
    planName: string
    reason: string | null
    status: string
  }
  tenant: {
    id: string
    name: string
  }
  updatedAt: string
}

export type UpdateMobileOperationProfileServiceInput = {
  changeReason?: string
  expectedAccessMode: OperationProfileAccessMode
  nextAccessMode: OperationProfileAccessMode
  serviceKey: OperationProfileServiceKey
}

export type UpdateMobileOperationProfileServiceResult =
  | { status: "conflict" }
  | { status: "failed" }
  | { status: "saved" }
