import type {
  TenantBusinessProfitPolicySettings,
  TenantMigrationSetupMode,
  TenantMigrationSetupSettings,
  TenantOperationProfileReadModel,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import type { GettingStartedStepKey } from "@/hooks/use-getting-started-params"
import type { GoLiveChecklistData } from "@/lib/getting-started/go-live-readiness"

export type GettingStartedChargeDefinitionRow = {
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
  appliesToMembers?: boolean
  id: string
  chargeFrequency:
    | "recurring_monthly"
    | "per_contribution"
    | "one_time"
    | "manual"
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  isActive: boolean
  isMonthlyLevy?: boolean
  kind: "fixed" | "percentage"
  name: string
  purpose?:
    | "general"
    | "member_share"
    | "loan_fee"
    | "membership_fee"
    | "penalty"
  versions: Array<{
    amount: number
    chargeValueType: "fixed_amount" | "percentage"
    effectiveFrom: string
    id: string
    notes?: string | null
    status: "current" | "historical" | "scheduled"
  }>
}

export type GettingStartedShareStructureVersionRow = {
  amount: number
  basis: "after_charge_deductions"
  effectiveFrom: string
  id: string
  notes?: string | null
  valueType: "fixed_amount" | "percentage"
}

export type GettingStartedShareBusinessRow = {
  capitalAmount: number
  endDate: string | null
  id: string
  linkedDividendPeriodId?: string | null
  name: string
  notes?: string | null
  profitAmount: number
  profitEntries: Array<{
    allocatableProfitAmount: number
    expenseAmount: number
    id: string
    linkedDividendPeriodId?: string | null
    profitAmount: number
    profitDate: string
    reason?: string | null
    sourceType: string
    status: string
  }>
  startDate: string
  status: string
}

export type GettingStartedDividendPeriodRow = {
  id: string
  label: string
}

export type GettingStartedBusinessProfitSeasonRow = {
  businessNames: string[]
  deductionAmount: number
  deductionReason?: string | null
  distributableAmount: number
  entryDeductionAmount: number
  grossProfitAmount: number
  id?: string | null
  key: string
  label: string
  periodEnd: string
  periodStart: string
  profitEntries: Array<{
    businessName: string
    deductionAmount: number
    profitAmount: number
    profitDate: string
    reason?: string | null
    status: string
  }>
  profitEntryCount: number
  status: "pending" | "draft" | "approved" | "published" | "closed"
}

export type GettingStartedMemberOption = {
  id: string
  label: string
}

export type GettingStartedMemberSummary = {
  email?: string | null
  fullName: string
  id: string
  joinedAt: string
  memberNumber: string
}

export type GettingStartedLegacyLoanDraftRow = {
  closedAt: string | null
  guarantorOneMemberId?: string | null
  guarantorTwoMemberId?: string | null
  id: string
  loanLabel: string
  memberId: string
  memberName: string
  memberNumber: string
  openedAt: string
  outstandingPrincipalBalance: number
  principalAmount: number
  savingsDuringLoan: number
  scheduledMonthlyPrincipalRepayment: number
}

export type GettingStartedMemberAmountLogRow = {
  amount: number
  effectiveFrom: string
  id: string
  notes?: string | null
}

export type GettingStartedMemberActivityEventRow = {
  effectiveMonth: string
  id: string
  notes?: string | null
  reason?: string | null
  status: "active" | "inactive"
}

export type GettingStartedMigrationMemberReviewRow = {
  appliedBackfillBatches: number
  appliedBackfillMonths: number
  backfillDraftBatches: number
  fullName: string
  id: string
  joinedAt: string
  legacyLoanDrafts: number
  memberNumber: string
  profitAdjustments: number
  rowAdjustments: number
  status: "profile_only" | "configured" | "backfill_draft" | "backfill_applied"
}

export type GettingStartedProfitMigrationOptionRow = {
  allocatableProfitAmount: number
  availableAmount: number
  businessName: string
  editableAvailableAmount: number
  expenseAmount: number
  id: string
  memberAllocatedAmount: number
  memberMigrationAdjustmentAmount: number
  memberPublishedAllocationAmount: number
  profitAmount: number
  profitDate: string
  seasonLabel?: string | null
  seasonPeriodEnd?: string | null
  totalDisbursedAmount: number
}

export type GettingStartedPageViewProps = {
  activeStep: GettingStartedStepKey
  /** Owner KYC and financing for step 11; loaded only on that step. */
  goLiveChecklist?: GoLiveChecklistData | null
  businessPolicy: TenantBusinessProfitPolicySettings
  businessProfitSeasons: GettingStartedBusinessProfitSeasonRow[]
  chargeDefinitions: GettingStartedChargeDefinitionRow[]
  dividendPeriods: GettingStartedDividendPeriodRow[]
  memberNumberPrefix?: string | null
  migrationSnapshot: InitialMigrationSnapshot
  migrationSetup: TenantMigrationSetupSettings
  // Step 5 switching locks once member records have been applied.
  modeLocked: boolean
  operationProfile: TenantOperationProfileReadModel
  quickFillEnabled: boolean
  recommendationReason: { members: number; years: number } | null
  recommendedMigrationSetupMode: TenantMigrationSetupMode | null
  requiresHistoricalBackfill?: boolean
  shareBusinesses: GettingStartedShareBusinessRow[]
  sharePolicy: TenantSharePolicySettings
  shareStructureVersions: GettingStartedShareStructureVersionRow[]
  tenantHost: string | null
  tenantName: string
  tenantStartDate: string | null
}

export type GettingStartedUnavailableState = {
  body: string
  description: string
  status: "unavailable"
  title: string
}

export type GettingStartedRedirectState = {
  href: "/" | "/onboarding-success"
  status: "redirect"
}

export type GettingStartedReadyState = {
  data: GettingStartedPageViewProps
  status: "ready"
}

export type GettingStartedPageState =
  | GettingStartedUnavailableState
  | GettingStartedRedirectState
  | GettingStartedReadyState
