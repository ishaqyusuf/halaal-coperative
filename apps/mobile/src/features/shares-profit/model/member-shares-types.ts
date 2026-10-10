import type { MobileReadCacheState } from "@/lib/read-cache"
import type { MobileMemberSection } from "@/features/member-core/public/member-core-types"

export type MobileMemberShareApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"

export type MobileMemberShareApplication = {
  approvedUnits: number | null
  createdAt: string
  id: string
  notes: string | null
  requestedUnits: number
  reviewedAt: string | null
  reviewNotes: string | null
  shareValueSnapshot: number
  status: MobileMemberShareApplicationStatus
  unitAmountSnapshot: number
}

export type MobileMemberShareApplicationCreateInput = {
  notes?: string
  requestedUnits: number
}

export type MobileMemberSharePolicy = {
  compulsoryShareUnits: number
  configurationMode: "monthly_history" | "unit_based"
  maximumShareUnits: number
  unitAmount: number
}

export type MobileMemberSharePosition = {
  approvedOptionalUnits: number
  compulsoryUnits: number
  maximumUnits: number
  pendingOptionalUnits: number
  remainingOptionalUnits: number
  totalApprovedUnits: number
  totalApprovedValue: number
  totalPendingUnits: number
  totalPendingValue: number
  unitAmount: number
}

export type MobileMemberShares = {
  applicationNextCursor: string | null
  applicationTotal: number
  applications: MobileMemberShareApplication[]
  cache?: MobileReadCacheState
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  policy: MobileMemberSharePolicy | null
  position: MobileMemberSharePosition | null
  section: MobileMemberSection
  state:
    | "available"
    | "database_unavailable"
    | "member_profile_missing"
    | "unit_model_inactive"
}

export type MobileMemberShareApplicationsPage = {
  data: MobileMemberShareApplication[]
  nextCursor: string | null
  state: "available" | "database_unavailable" | "member_profile_missing"
  total: number
}
