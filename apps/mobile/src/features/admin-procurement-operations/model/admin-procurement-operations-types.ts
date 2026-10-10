export type ProcurementLane = "review" | "activate" | "servicing" | "completed"

export type ProcurementCapabilities = {
  activate: boolean
  review: boolean
  submitPayment: boolean
  view: boolean
}

export type ProcurementScheduleItem = {
  amount: number
  dueDate: string
  id: string
  installmentNumber: number
  outstandingAmount: number
  paidAmount: number
  status: "due" | "overdue" | "paid" | "partially_paid" | "pending" | "waived"
}

export type ProcurementOperation = {
  approvedCost: number | null
  approvedMonthlyRepayment: number | null
  approvedRepaymentMonths: number | null
  createdAt: string
  id: string
  itemDescription: string | null
  itemName: string
  lane: ProcurementLane
  member: { email: string | null; fullName: string; id: string; memberNumber: string }
  nextDue: ProcurementScheduleItem | null
  outstandingAmount: number
  overdueCount: number
  policyMaximumPaybackMonths: number
  purchasedAt: string | null
  purchaseNotes: string | null
  purchaseReference: string | null
  repaymentScheduleItems: ProcurementScheduleItem[]
  requestedAt: string
  requestedCost: number
  requestedRepaymentMonths: number
  reviewedAt: string | null
  reviewedByUser: { email: string; fullName: string; id: string } | null
  reviewNotes: string | null
  status: string
  vendorName: string | null
}

export type ProcurementWorkspace = {
  capabilities: ProcurementCapabilities
  currencyCode: string
  generatedAt: string
  items: ProcurementOperation[]
  lane: ProcurementLane
  summary: {
    activeRequests: number
    approvedRequests: number
    dueScheduleItems: number
    outstandingAmount: number
    overdueScheduleItems: number
    pendingRequests: number
    rejectedRequests: number
    totalRequests: number
    totalApprovedCost: number
    totalRequestedCost: number
  }
}

export type ProcurementCommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}
