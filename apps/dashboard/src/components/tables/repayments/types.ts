export type RepaymentView = "collections" | "schedule" | "history"

export type RepaymentScheduleRow = {
  amountPaid: number
  dueAt: Date | string
  id: string
  installmentNumber: number
  /** Unpaid and due before today (decided by the server). */
  isLate: boolean
  /** The latest follow-up's outcome and promised date (row-only shape). */
  latestCollectionFollowUp: {
    promiseToPayAt?: Date | string | null
    status: string
  } | null
  loan: {
    id: string
    loanProduct: { name: string }
    member: { fullName: string; memberNumber: string }
  }
  outstandingAmount: number
  status: "pending" | "due" | "partially_paid" | "overdue" | "paid" | "waived"
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
