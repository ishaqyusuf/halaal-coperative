import type { MobileReadCacheState } from "@/lib/read-cache"

export type MobileGuarantorDecision = "approved" | "rejected"

export type MobileGuarantorRequest = {
  id: string
  loanRequest: {
    borrowerMemberNumber: string
    borrowerName: string
    estimatedMonthlyServicing: number
    id: string
    loanProductName: string
    purpose: string | null
    requestedAmount: number
    requestedAt: string
    requestedTermMonths: number
    status: string
  }
  requestedAt: string
  requestedByName: string | null
  respondedAt: string | null
  respondedByName: string | null
  responseNotes: string | null
  status: string
}

export type MobileMemberGuarantorSnapshot = {
  approvals: MobileGuarantorRequest[]
  cache?: MobileReadCacheState
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    approvedApprovals: number
    pendingApprovals: number
    rejectedApprovals: number
    totalApprovals: number
  }
}

export type MobileGuarantorResponseInput = {
  decisionConfirmed: true
  guarantorApprovalId: string
  notes?: string
  status: MobileGuarantorDecision
}
