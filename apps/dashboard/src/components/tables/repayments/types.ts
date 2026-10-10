export type RepaymentView = "collections" | "schedule" | "history"

export type RepaymentScheduleRow = {
  amountPaid: number
  dueAt: Date | string
  id: string
  installmentNumber: number
  latestCollectionFollowUp: {
    assignedToUser: { fullName: string } | null
    caseStage: "active" | "escalated" | "promise_tracking" | "resolved"
    createdAt: Date | string
    nextActionAt: Date | string | null
    priority: "low" | "normal" | "high"
    resolutionStatus: "open" | "resolved"
    status: string
  } | null
  loan: {
    id: string
    loanProduct: { name: string }
    member: { fullName: string; memberNumber: string }
  }
  outstandingAmount: number
  status:
    | "pending"
    | "due"
    | "partially_paid"
    | "overdue"
    | "paid"
    | "waived"
  totalDue: number
}

export type RepaymentHistoryRow = {
  amount: number
  id: string
  loan: {
    id: string
    loanProduct: { name: string }
  }
  member: { fullName: string; memberNumber: string }
  paidAt: Date | string
  reference: string | null
  repaymentScheduleItemId: string | null
  status: "pending" | "posted" | "reversed"
}
