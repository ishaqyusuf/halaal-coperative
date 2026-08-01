export const membershipApprovalStatusFilters = [
  { id: "pending_email_verification", name: "Awaiting verification" },
  { id: "pending_approval", name: "Pending approval" },
  { id: "approved", name: "Approved" },
  { id: "rejected", name: "Rejected" },
  { id: "cancelled", name: "Cancelled" },
]

export const membershipApprovalSortOptions = [
  { id: "submittedAt,desc", name: "Newest submitted" },
  { id: "submittedAt,asc", name: "Oldest submitted" },
  { id: "fullName,asc", name: "Applicant A–Z" },
  { id: "fullName,desc", name: "Applicant Z–A" },
  { id: "status,asc", name: "Request status" },
  { id: "emailVerifiedAt,desc", name: "Verification status" },
] as const
