export type BackfillMonthStatus = "active" | "missed" | "paused" | "adjusted"

export type BackfillMemberActivityStatus = "active" | "inactive"

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

export type MemberLedgerBackfillLoanTakenEvent = {
  amount: number
  commitmentAmount: number
  id: string
  label: string
  openingPendingAmount: number
  repaymentAmount: number
  termMonths: number
}

export type MemberLedgerBackfillRow = {
  chargeDeductions: Record<string, number>
  dividendCredit: number
  dividendLabel?: string
  dividendProfitEntryId?: string
  dividendSharePercentage?: number
  effectiveDateSegmentKey: string
  grossContribution: number
  hasManualRepaymentAdjustment?: boolean
  hasManualSavingsAdjustment?: boolean
  isEdited?: boolean
  loanColumns: MemberLedgerBackfillLoanColumn[]
  loanTakenEvent?: MemberLedgerBackfillLoanTakenEvent
  month?: string
  netSavingsContribution: number
  period: string
  runningSavingsBalance: number
  runningShareCapitalBalance: number
  savingsContribution: number
  shareCapitalContribution: number
  status?: BackfillMonthStatus
  statusReason?: string
}

export type MonthlyLedgerSegment = {
  kind: "monthly"
  key: string
  label: string
  reasonList: string[]
  rows: MemberLedgerBackfillRow[]
  summary: {
    chargeSummaries: Array<{
      label: string
      maxAmount: number
      minAmount: number
    }>
    hasManualRepaymentAdjustment: boolean
    hasManualSavingsAdjustment: boolean
    hasLegacyLoan: boolean
    rowCount: number
    shareCapitalSummary: {
      maxAmount: number
      minAmount: number
    }
  }
}

export type ProfitLedgerSegment = {
  kind: "profit"
  key: string
  label: string
  reasonList: string[]
  row: MemberLedgerBackfillRow
}

export type LoanTakenLedgerSegment = {
  kind: "loan_taken"
  key: string
  label: string
  reasonList: string[]
  loan: MemberLedgerBackfillLoanTakenEvent
  row: MemberLedgerBackfillRow
}

export type MemberLedgerBackfillSegment =
  | MonthlyLedgerSegment
  | ProfitLedgerSegment
  | LoanTakenLedgerSegment

export type EffectiveDateSegment = MemberLedgerBackfillSegment

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
  status?: BackfillMonthStatus
}

export type BackfillMemberActivityEvent = {
  effectiveFrom: string
  notes?: string
  reason?: string
  status: BackfillMemberActivityStatus
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
  hasManualRepaymentAdjustment?: boolean
  hasManualSavingsAdjustment?: boolean
  isEdited: boolean
  loanEvent?: BackfillLoanEvent
  loanRepaymentOnTime?: boolean
  notes?: string
  loanService: number
  month: string
  monthLabel: string
  netDeposit: number
  pendingLoanPayment: number
  plannedChargeValues?: Record<string, number>
  plannedLoanRepaymentAmount?: number
  plannedSavingsContribution?: number
  plannedShare?: number
  share: number
  status: BackfillMonthStatus
  statusReason?: string
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
  activityEvents?: BackfillMemberActivityEvent[]
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
