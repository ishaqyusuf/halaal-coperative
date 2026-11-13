export const membershipApprovalStatusFilters = [
  { id: "pending_approval", name: "Waiting for approval" },
  { id: "pending_email_verification", name: "Email not confirmed" },
  { id: "approved", name: "Approved" },
  { id: "rejected", name: "Declined" },
  { id: "cancelled", name: "Cancelled" },
]

export const membershipApprovalSortOptions = [
  { id: "submittedAt,desc", name: "Newest first" },
  { id: "submittedAt,asc", name: "Oldest first" },
  { id: "fullName,asc", name: "Name A–Z" },
  { id: "fullName,desc", name: "Name Z–A" },
  { id: "status,asc", name: "Status" },
  { id: "emailVerifiedAt,desc", name: "Email confirmed" },
] as const
