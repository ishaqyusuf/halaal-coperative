export type BackfillMonthStatus = "active" | "missed" | "paused" | "adjusted"

export type BackfillAmountLog = {
  amount: number
  effectiveFrom: string
  notes?: string
}

export type BackfillShareVersion = {
  amount: number
  effectiveFrom: string
  notes?: string
}

export type BackfillChargeVersion = {
  amount: number
  effectiveFrom: string
}

export type BackfillChargeDefinition = {
  code: string
  label: string
  versions: BackfillChargeVersion[]
}

export type BackfillLoanEvent = {
  durationMonths: number
  loanAmount: number
  monthlyLoanServiceAmount: number
  startMonth: string
  status?: BackfillMonthStatus
  topUp: number
}

export type BackfillDividendEntry = {
  amount: number
  label: string
  month: string
}

export type BackfillExistingHistoryImpact = {
  kind: "charge" | "contribution" | "dividend" | "repayment" | "share"
  message: string
  month: string
  severity: "high" | "medium" | "low"
}

export type BackfillProfitPeriod = {
  distributableAmount: number
  month: string
  notes?: string
  totalProfitAmount: number
}

export type BackfillRow = {
  amount: number
  chargeValues: Record<string, number>
  dividend: number
  dividendLabel?: string
  existingHistoryImpacts: BackfillExistingHistoryImpact[]
  isEdited: boolean
  loanEvent?: BackfillLoanEvent
  loanService: number
  month: string
  monthLabel: string
  netDeposit: number
  pendingLoanPayment: number
  share: number
  status: BackfillMonthStatus
}

export type BackfillWarning = {
  code: string
  message: string
  month?: string
  severity: "high" | "medium" | "low"
}

export type BackfillSummary = {
  editedRows: number
  monthsGenerated: number
  totalCharges: number
  totalDividend: number
  totalLoanService: number
  totalNetDeposit: number
  totalPendingLoanPayment: number
  totalShare: number
}

export type BuildBackfillDraftInput = {
  amountLogs: BackfillAmountLog[]
  chargeDefinitions: BackfillChargeDefinition[]
  defaultShareVersions: BackfillShareVersion[]
  dividendEntries?: BackfillDividendEntry[]
  endMonth: string
  existingHistoryImpacts?: BackfillExistingHistoryImpact[]
  loanEvents?: BackfillLoanEvent[]
  memberJoinedMonth: string
  profitPeriods?: BackfillProfitPeriod[]
  shareOverrideVersions?: BackfillShareVersion[]
  startMonth: string
}

export type BackfillDraft = {
  chargeColumns: Array<{ code: string; label: string }>
  profitPeriods: BackfillProfitPeriod[]
  rows: BackfillRow[]
  summary: BackfillSummary
  warnings: BackfillWarning[]
}
