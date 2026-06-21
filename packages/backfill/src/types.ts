export type BackfillMonthStatus = "active" | "missed" | "paused" | "adjusted"

export type ChargeFrequency =
  | "recurring_monthly"
  | "per_contribution"
  | "one_time"
  | "manual"

export type ChargeValueType = "fixed_amount" | "percentage"

export type ShareValueType = "fixed_amount" | "percentage"

export type ShareBasis = "after_charge_deductions"

export type LegacyLoanPosition = {
  disbursementMonth: string
  id: string
  label: string
  loanPeriodSavingsContribution: number
  notes?: string
  principalAmount: number
  scheduledMonthlyRepayment: number
}

export type MemberLedgerBackfillLoanColumn = {
  id: string
  label: string
  outstandingPrincipalBalance: number
  repaymentOnTime?: boolean
  repaymentAmount: number
}

export type MemberLedgerBackfillRow = {
  chargeDeductions: Record<string, number>
  dividendCredit: number
  dividendLabel?: string
  dividendProfitEntryId?: string
  effectiveDateSegmentKey: string
  grossContribution: number
  isEdited?: boolean
  loanColumns: MemberLedgerBackfillLoanColumn[]
  month?: string
  netSavingsContribution: number
  period: string
  runningSavingsBalance: number
  runningShareCapitalBalance: number
  savingsContribution: number
  shareCapitalContribution: number
}

export type EffectiveDateSegment = {
  key: string
  label: string
  rows: MemberLedgerBackfillRow[]
  summary: {
    chargeLabels: string[]
    hasLegacyLoan: boolean
    rowCount: number
  }
}

export type BackfillAmountLog = {
  amount: number
  effectiveFrom: string
  notes?: string
}

export type BackfillShareVersion = {
  amount: number
  effectiveFrom: string
  basis?: ShareBasis
  notes?: string
  valueType?: ShareValueType
}

export type BackfillChargeVersion = {
  amount: number
  effectiveFrom: string
  valueType?: ChargeValueType
}

export type BackfillChargeDefinition = {
  code: string
  frequency?: ChargeFrequency
  label: string
  versions: BackfillChargeVersion[]
}

export type BackfillLoanEvent = {
  durationMonths: number
  id?: string
  label?: string
  loanAmount: number
  loanPeriodSavingsContribution?: number
  monthlyLoanServiceAmount: number
  openingOutstandingPrincipalBalance?: number
  startMonth: string
  status?: BackfillMonthStatus
  topUp: number
}

export type BackfillDividendEntry = {
  amount: number
  label: string
  month: string
  profitEntryId?: string
  sharePercentage?: number
}

export type BackfillRowAdjustment = {
  loanRepaymentOnTime?: boolean
  loanRepaymentAmount?: number
  month: string
  notes?: string
  savingsContribution?: number
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
  dividendProfitEntryId?: string
  dividendSharePercentage?: number
  existingHistoryImpacts: BackfillExistingHistoryImpact[]
  isEdited: boolean
  loanEvent?: BackfillLoanEvent
  loanRepaymentOnTime?: boolean
  notes?: string
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
  rowAdjustments?: BackfillRowAdjustment[]
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
