import type { MobileReadCacheState } from "@/lib/read-cache"
import type {
  MobileMemberStatementSection,
  MobileOverviewMetric,
} from "@/features/member-core/public/member-core-types"

export type MobileAdminLifecycleQaState =
  | "denied"
  | "empty"
  | "error"
  | "loading"
  | "not-found"
  | "offline"
  | "stale"

export type MobileAdminMemberStatus =
  | "pending"
  | "active"
  | "inactive"
  | "suspended"
  | "exited"

export type MobileAdminMemberKycStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "rejected"

export type MobileAdminMemberRow = {
  activeMonthlyCommitment: number | null
  deductionSourceName: string | null
  email: string | null
  fullName: string
  id: string
  joinedAt: string
  kycStatus: string
  linkedUserEmail: string | null
  memberNumber: string
  memberType: string
  phoneNumber: string | null
  status: string
}

export type MobileAdminMemberReviewQueue = {
  count: number
  detail: string
  key: "membership-approvals" | "kyc-documents"
  label: string
  severity: "neutral" | "warning" | "critical"
}

export type MobileAdminMemberOnboardingRequest = {
  createdAt: string
  email: string
  emailVerifiedAt: string | null
  fullName: string
  id: string
  linkedUserEmail: string | null
  memberNumber: string
  phoneNumber: string | null
  status: string
}

export type MobileAdminMembers = {
  cache?: MobileReadCacheState
  generatedAt: string
  memberExpansion?: {
    activeMemberCount: number
    activeMemberLimit: number | null
    planCode: string | null
    planName: string | null
    reason: string | null
    status: "at_capacity" | "available" | "restricted"
  }
  members: MobileAdminMemberRow[]
  onboardingRequests: MobileAdminMemberOnboardingRequest[]
  page: number
  pageSize: number
  reviewQueues: MobileAdminMemberReviewQueue[]
  summary: {
    activeCount: number
    kycPendingCount: number
    linkedUsersCount: number
    pageCount: number
    totalCount: number
  }
  total: number
}

export type MobileAdminMemberDetail = {
  cache?: MobileReadCacheState
  generatedAt: string
  member:
    | (MobileAdminMemberRow & {
        exitedAt: string | null
        linkedUserName: string | null
      })
    | null
  sections: MobileMemberStatementSection[]
  stats: MobileOverviewMetric[]
}

export type MobileAdminOverview = {
  actionQueue: {
    count: number
    detail: string
    key: string
    label: string
    severity: "neutral" | "warning" | "critical"
  }[]
  cache?: MobileReadCacheState
  complianceWatch: { count: number; key: string; label: string }[]
  generatedAt: string
  recentActivity: {
    detail: string
    id: string
    label: string
    occurredAt: string
  }[]
  stats: MobileOverviewMetric[]
  warnings: { key: string; label: string }[]
}

export type MobileAdminMembersListInput = {
  kycStatus?: MobileAdminMemberKycStatus
  page?: number
  pageSize?: number
  search?: string
  status?: MobileAdminMemberStatus
}

export type MobileAdminMemberCreateInput = {
  address?: string
  email?: string
  fullName: string
  joinedAt: string
  memberNumber: string
  memberType: "civil_servant" | "individual" | "business"
  monthlyCommitment?: number
  occupation?: string
  phoneNumber?: string
}

export type MobileAdminMemberStatusUpdateInput = {
  memberId: string
  reviewNotes: string
  status: MobileAdminMemberStatus
}

export type MobileAdminMemberKycUpdateInput = {
  governmentIdNumber?: string
  kycDocumentType?: string
  kycDocumentUrl?: string
  kycReviewNotes: string
  kycStatus: MobileAdminMemberKycStatus
  memberId: string
}

export type MobileAdminMemberOnboardingReviewInput = {
  decision: "approved" | "rejected"
  requestId: string
  reviewNotes: string
}

export type MobileAdminActionResult = { id: string; status: string }
