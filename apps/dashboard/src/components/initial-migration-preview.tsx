import {
  groupRowsByEffectiveDateSegment,
  type MemberLedgerBackfillRow,
} from "@halaalvest/backfill"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import { formatCurrency } from "@halaalvest/utils"
import { DashboardSurfaceCard, TrendPill } from "@/components/dashboard"
import {
  ApplyMemberBackfillContent,
  CreateLegacyLoanMigrationDraftContent,
  FinalizeInitialMigrationContent,
  LegacyLoanDraftEditContent,
  MarkLegacyLoansReviewedContent,
  ProfitMigrationAdjustmentContent,
} from "@/components/initial-migration-action-content"
import { MemberPreviewPicker } from "@/components/migration/member-preview-picker"
import {
  DefaultingMonthsButton,
  MemberBackfillAdjustmentButton,
  MemberBackfillCellEditors,
  MonthStatusControl,
} from "@/components/migration/member-backfill-controls"
import { MemberLedgerBackfillTable } from "@/components/migration/member-ledger-backfill-table"
import { SaveBackfillDraftButton } from "@/components/migration/save-backfill-draft-button"
import {
  CommitmentHistoryEntryForm,
  LoanHistoryEntryForm,
} from "@/components/migration/member-migration-history-forms"
import { MemberCreateSheet } from "@/components/sheets/member-create-sheet"
import {
  MigrationActionOverlay,
  MigrationActionSheet,
  MigrationActionTrigger,
} from "@/components/sheets/migration-action-sheet"
import { MemberMigrationInputPanels } from "@/components/migration/member-migration-input-panels"
import { MemberBackfillActivityWindowsForm } from "@/components/members/member-backfill-activity-windows-form"
import type { GoLiveChecklistData } from "@/lib/getting-started/go-live-readiness"

const previewRows: MemberLedgerBackfillRow[] = [
  {
    chargeDeductions: { "Admin levy": 100, Welfare: 50 },
    dividendCredit: 0,
    effectiveDateSegmentKey: "Segment 1: Aug 2025 - Jan 2026",
    grossContribution: 5000,
    loanColumns: [
      {
        id: "loan-a",
        label: "Loan A",
        outstandingPrincipalBalance: 110000,
        repaymentAmount: 10000,
      },
    ],
    netSavingsContribution: 4750,
    period: "Aug 2025",
    runningSavingsBalance: 4750,
    runningShareCapitalBalance: 100,
    savingsContribution: 5000,
    shareCapitalContribution: 100,
  },
  {
    chargeDeductions: { "Admin levy": 100, Welfare: 50 },
    dividendCredit: 0,
    effectiveDateSegmentKey: "Segment 1: Aug 2025 - Jan 2026",
    grossContribution: 5000,
    loanColumns: [
      {
        id: "loan-a",
        label: "Loan A",
        outstandingPrincipalBalance: 100000,
        repaymentAmount: 10000,
      },
    ],
    netSavingsContribution: 4750,
    period: "Sep 2025",
    runningSavingsBalance: 9500,
    runningShareCapitalBalance: 200,
    savingsContribution: 5000,
    shareCapitalContribution: 100,
  },
  {
    chargeDeductions: { "Admin levy": 100, Welfare: 50 },
    dividendCredit: 0,
    effectiveDateSegmentKey: "Segment 1: Aug 2025 - Jan 2026",
    grossContribution: 5000,
    isEdited: true,
    loanColumns: [
      {
        id: "loan-a",
        label: "Loan A",
        outstandingPrincipalBalance: 65000,
        repaymentAmount: 25000,
      },
    ],
    netSavingsContribution: 4750,
    period: "Nov 2025",
    runningSavingsBalance: 19000,
    runningShareCapitalBalance: 400,
    savingsContribution: 5000,
    shareCapitalContribution: 100,
  },
  {
    chargeDeductions: { "Admin levy": 150, Welfare: 100 },
    dividendCredit: 0,
    effectiveDateSegmentKey: "Segment 2: Feb 2026 - Apr 2026",
    grossContribution: 5000,
    loanColumns: [
      {
        id: "loan-a",
        label: "Loan A",
        outstandingPrincipalBalance: 55000,
        repaymentAmount: 10000,
      },
    ],
    netSavingsContribution: 4600,
    period: "Feb 2026",
    runningSavingsBalance: 23600,
    runningShareCapitalBalance: 550,
    savingsContribution: 5000,
    shareCapitalContribution: 150,
  },
  {
    chargeDeductions: { "Admin levy": 150, Welfare: 100 },
    dividendCredit: 0,
    effectiveDateSegmentKey: "Segment 2: Feb 2026 - Apr 2026",
    grossContribution: 5000,
    isEdited: true,
    loanColumns: [
      {
        id: "loan-a",
        label: "Loan A",
        outstandingPrincipalBalance: 0,
        repaymentAmount: 45000,
      },
    ],
    netSavingsContribution: 4600,
    period: "Apr 2026",
    runningSavingsBalance: 32800,
    runningShareCapitalBalance: 850,
    savingsContribution: 5000,
    shareCapitalContribution: 150,
  },
  {
    chargeDeductions: { "Admin levy": 150, Welfare: 100 },
    dividendCredit: 0,
    effectiveDateSegmentKey: "Segment 3: May 2026 - Jun 2026",
    grossContribution: 15000,
    loanColumns: [],
    netSavingsContribution: 13275,
    period: "May 2026",
    runningSavingsBalance: 46075,
    runningShareCapitalBalance: 2325,
    savingsContribution: 15000,
    shareCapitalContribution: 1475,
  },
  {
    chargeDeductions: { "Admin levy": 150, Welfare: 100 },
    dividendCredit: 0,
    effectiveDateSegmentKey: "Segment 3: May 2026 - Jun 2026",
    grossContribution: 15000,
    loanColumns: [],
    netSavingsContribution: 13275,
    period: "Jun 2026",
    runningSavingsBalance: 59350,
    runningShareCapitalBalance: 3800,
    savingsContribution: 15000,
    shareCapitalContribution: 1475,
  },
]

const demoLegacyLoanDrafts = [
  {
    closedAt: null,
    guarantorOneMemberId: null,
    guarantorTwoMemberId: null,
    id: "legacy-loan-demo-1",
    loanLabel: "Loan A",
    memberId: "member-demo-1",
    memberName: "Aisha Bello",
    memberNumber: "MBR-001",
    openedAt: "2025-08-01",
    outstandingPrincipalBalance: 65000,
    principalAmount: 120000,
    savingsDuringLoan: 5000,
    scheduledMonthlyPrincipalRepayment: 10000,
    status: "Active",
  },
  {
    closedAt: null,
    guarantorOneMemberId: null,
    guarantorTwoMemberId: null,
    id: "legacy-loan-demo-2",
    loanLabel: "Loan A override",
    memberId: "member-demo-1",
    memberName: "Aisha Bello",
    memberNumber: "MBR-001",
    openedAt: "2025-11-01",
    outstandingPrincipalBalance: 0,
    principalAmount: 120000,
    savingsDuringLoan: 5000,
    scheduledMonthlyPrincipalRepayment: 25000,
    status: "One-time override",
  },
  {
    closedAt: "2026-04-01",
    guarantorOneMemberId: null,
    guarantorTwoMemberId: null,
    id: "legacy-loan-demo-3",
    loanLabel: "Loan A settlement",
    memberId: "member-demo-1",
    memberName: "Aisha Bello",
    memberNumber: "MBR-001",
    openedAt: "2026-04-01",
    outstandingPrincipalBalance: 0,
    principalAmount: 120000,
    savingsDuringLoan: 5000,
    scheduledMonthlyPrincipalRepayment: 45000,
    status: "Settled",
  },
]

const demoMemberAmountLogs = [
  {
    amount: 5000,
    effectiveFrom: "2025-01-01",
    id: "member-amount-demo-1",
    notes: "Initial commitment",
  },
]

type LegacyLoanDraftRow = {
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

type MemberOption = {
  id: string
  label: string
}

type MemberAmountLogRow = {
  amount: number
  effectiveFrom: string
  id: string
  notes?: string | null
}

type MemberActivityEventRow = {
  effectiveMonth: string
  id: string
  notes?: string | null
  reason?: string | null
  status: "active" | "inactive"
}

type MigrationMemberReviewRow = {
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

type ProfitMigrationOptionRow = {
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

function BusinessProfitMigrationPanel({
  disabled,
  memberId,
  options,
}: {
  disabled: boolean
  memberId: string | null | undefined
  options: ProfitMigrationOptionRow[]
}) {
  const totalMemberProfit = options.reduce(
    (total, option) => total + option.memberAllocatedAmount,
    0
  )

  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-border/70 bg-background p-4">
        <p className="text-sm font-semibold text-foreground">
          No business profit rows
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add profit history in the business step before assigning member
          migration profit.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Past business profit
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This member’s share of business profit from before you started.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-muted-foreground">Selected member total</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(totalMemberProfit)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          const formId = `profit-migration-${option.id}`
          const rowDisabled =
            disabled ||
            !memberId ||
            (option.editableAvailableAmount <= 0 &&
              option.memberMigrationAdjustmentAmount <= 0)

          return (
            <DashboardSurfaceCard
              as="article"
              className="rounded-lg"
              key={option.id}
            >
              <div className="grid gap-4 xl:grid-cols-[7rem_minmax(0,1.4fr)_9rem_9rem_9rem_12rem_auto] xl:items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {option.profitDate}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {option.businessName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gross {formatCurrency(option.profitAmount)} · deduction{" "}
                    {formatCurrency(option.expenseAmount)}
                  </p>
                  {option.seasonLabel ? (
                    <p className="text-xs text-muted-foreground">
                      {option.seasonLabel}
                      {option.seasonPeriodEnd
                        ? ` · ends ${option.seasonPeriodEnd}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Shareable</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(option.allocatableProfitAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigned</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(option.memberAllocatedAmount)}
                  </p>
                  {option.memberPublishedAllocationAmount > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(option.memberPublishedAllocationAmount)}{" "}
                      published
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(option.editableAvailableAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(option.totalDisbursedAmount)} disbursed
                  </p>
                </div>
                <ProfitMigrationAdjustmentContent
                  disabled={rowDisabled}
                  formId={formId}
                  memberId={memberId}
                  option={option}
                />
              </div>
            </DashboardSurfaceCard>
          )
        })}
      </div>
    </div>
  )
}

function CommitmentHistoryPanel({
  disabled,
  memberAmountLogs,
  memberId,
  memberJoinedAt,
}: {
  disabled: boolean
  memberAmountLogs: MemberAmountLogRow[]
  memberId: string | null | undefined
  memberJoinedAt?: string | null
}) {
  return (
    <div className="space-y-3">
      <CommitmentHistoryEntryForm
        disabled={disabled}
        initialRows={memberAmountLogs.map((log) => ({
          amount: log.amount,
          effectiveFrom: log.effectiveFrom,
          id: log.id,
          notes: log.notes ?? null,
        }))}
        memberId={memberId}
        memberJoinedAt={memberJoinedAt}
      />
    </div>
  )
}

function LoanHistoryPanel({
  cooperativeStartDate,
  disabled,
  loans,
  memberId,
  memberJoinedAt,
  memberNumberPrefix,
  memberOptions,
  quickFillEnabled,
}: {
  cooperativeStartDate?: string | null
  disabled: boolean
  loans: Array<LegacyLoanDraftRow & { status: string }>
  memberId: string | null | undefined
  memberJoinedAt?: string | null
  memberNumberPrefix?: string | null
  memberOptions: MemberOption[]
  quickFillEnabled: boolean
}) {
  return (
    <div className="space-y-3">
      <LoanHistoryEntryForm
        cooperativeStartDate={cooperativeStartDate}
        disabled={disabled}
        initialRows={loans.map((loan) => ({
          closedAt: loan.closedAt,
          guarantorOneMemberId: loan.guarantorOneMemberId ?? null,
          guarantorTwoMemberId: loan.guarantorTwoMemberId ?? null,
          id: loan.id,
          loanLabel: loan.loanLabel,
          openedAt: loan.openedAt,
          outstandingPrincipalBalance: loan.outstandingPrincipalBalance,
          principalAmount: loan.principalAmount,
          savingsDuringLoan: loan.savingsDuringLoan,
          scheduledMonthlyPrincipalRepayment:
            loan.scheduledMonthlyPrincipalRepayment,
        }))}
        memberId={memberId}
        memberJoinedAt={memberJoinedAt}
        memberNumberPrefix={memberNumberPrefix}
        memberOptions={memberOptions}
        quickFillEnabled={quickFillEnabled}
      />
    </div>
  )
}

function LegacyLoanDraftEditSheet({
  disabled,
  loan,
  memberOptions,
}: {
  disabled: boolean
  loan: LegacyLoanDraftRow & { status: string }
  memberOptions: MemberOption[]
}) {
  return (
    <MigrationActionSheet
      bodyClassName="grid gap-4"
      description="What the member still owed when you started (the amount borrowed, without profit)."
      disabled={disabled}
      eyebrow="Old loan"
      mode="legacyLoanEdit"
      targetId={loan.id}
      title={`Edit ${loan.loanLabel}`}
      triggerLabel="Edit loan"
    >
      <LegacyLoanDraftEditContent
        disabled={disabled}
        loan={loan}
        memberOptions={memberOptions}
      />
    </MigrationActionSheet>
  )
}

function ActivityHistoryPanel({
  disabled,
  events,
  memberId,
  memberJoinedAt,
}: {
  disabled: boolean
  events: MemberActivityEventRow[]
  memberId: string | null | undefined
  memberJoinedAt?: string | null
}) {
  return (
    <MemberBackfillActivityWindowsForm
      disabled={disabled || !memberId || !memberJoinedAt}
      initialRows={events.map((event) => ({
        effectiveMonth: event.effectiveMonth,
        id: event.id,
        notes: event.notes ?? null,
        reason: event.reason ?? null,
        status: event.status,
      }))}
      memberId={memberId ?? ""}
      memberJoinedAt={memberJoinedAt ?? "1900-01-01"}
    />
  )
}

export function InitialMigrationPreview({
  generatedLedgerError,
  generatedLedgerRows,
  legacyLoanDrafts,
  memberActivityEvents,
  memberAmountLogs,
  memberOptions,
  memberNumberPrefix,
  migrationSnapshot,
  migrationMemberReview,
  profitMigrationOptions,
  quickFillEnabled,
  selectedMigrationMemberId,
  selectedMigrationMemberLabel,
  section = "overview",
  goLiveChecklist = null,
  tenantHost = null,
  tenantName,
  tenantStartDate,
}: {
  goLiveChecklist?: GoLiveChecklistData | null
  generatedLedgerError?: string | null
  generatedLedgerRows?: MemberLedgerBackfillRow[]
  legacyLoanDrafts?: LegacyLoanDraftRow[]
  memberActivityEvents?: MemberActivityEventRow[]
  memberAmountLogs?: MemberAmountLogRow[]
  memberOptions?: MemberOption[]
  memberNumberPrefix?: string | null
  migrationSnapshot?: InitialMigrationSnapshot
  migrationMemberReview?: MigrationMemberReviewRow[]
  profitMigrationOptions?: ProfitMigrationOptionRow[]
  quickFillEnabled: boolean
  selectedMigrationMemberId?: string | null
  selectedMigrationMemberLabel?: string | null
  section?: "loans" | "member-preview" | "overview"
  tenantHost?: string | null
  tenantName?: string
  tenantStartDate?: string | null
}) {
  const isLoansOnly = section === "loans"
  const isMemberPreview = section === "member-preview"
  const isMigrationOverview = section === "overview"
  const hasSelectedMigrationOverviewMember =
    isMigrationOverview && Boolean(selectedMigrationMemberId)
  const hasRealMigrationContext = Boolean(migrationSnapshot)
  const displayedLedgerRows =
    generatedLedgerRows && generatedLedgerRows.length > 0
      ? generatedLedgerRows
      : hasRealMigrationContext
        ? []
        : previewRows
  const segments = groupRowsByEffectiveDateSegment(displayedLedgerRows)
  const displayedLegacyLoanDrafts =
    legacyLoanDrafts !== undefined
      ? legacyLoanDrafts.map((loan) => ({
          ...loan,
          status: loan.outstandingPrincipalBalance > 0 ? "Active" : "Settled",
        }))
      : demoLegacyLoanDrafts
  const displayedMemberAmountLogs =
    memberAmountLogs !== undefined ? memberAmountLogs : demoMemberAmountLogs
  const displayedMemberActivityEvents = memberActivityEvents ?? []
  const displayedProfitMigrationOptions = profitMigrationOptions ?? []
  const reviewRows = migrationMemberReview ?? []
  const selectedMemberReview =
    reviewRows.find((member) => member.id === selectedMigrationMemberId) ?? null
  const selectedMemberBackfillApplied =
    selectedMemberReview?.status === "backfill_applied" ||
    (selectedMemberReview?.appliedBackfillBatches ?? 0) > 0 ||
    (selectedMemberReview?.appliedBackfillMonths ?? 0) > 0
  const mutableMigrationMemberOptions =
    reviewRows.length > 0
      ? (memberOptions ?? []).filter((member) => {
          const review = reviewRows.find((row) => row.id === member.id)

          return (
            review?.status !== "backfill_applied" &&
            (review?.appliedBackfillBatches ?? 0) === 0 &&
            (review?.appliedBackfillMonths ?? 0) === 0
          )
        })
      : (memberOptions ?? [])
  const mutableMigrationMemberIds = new Set(
    mutableMigrationMemberOptions.map((member) => member.id)
  )
  const appliedBackfillMembers = reviewRows.filter(
    (member) => member.status === "backfill_applied"
  ).length
  const membersMissingAppliedBackfill = reviewRows.filter(
    (member) => member.status !== "backfill_applied"
  ).length
  const activeLegacyLoanDrafts = displayedLegacyLoanDrafts.filter(
    (loan) => loan.outstandingPrincipalBalance > 0
  )
  const selectedMemberLegacyLoanDrafts = selectedMigrationMemberId
    ? displayedLegacyLoanDrafts.filter(
        (loan) => loan.memberId === selectedMigrationMemberId
      )
    : []
  const legacyLoansReviewed =
    migrationSnapshot?.steps.find((step) => step.key === "legacy_loans")
      ?.complete ?? false
  const latestLedgerRow = displayedLedgerRows[displayedLedgerRows.length - 1]
  const projectedShareCapital = latestLedgerRow?.runningShareCapitalBalance ?? 0
  const projectedTotalSavings = latestLedgerRow?.runningSavingsBalance ?? 0
  const firstLedgerRow = displayedLedgerRows[0]
  const latestLoanColumns = latestLedgerRow?.loanColumns ?? []
  const activeLoanColumns = latestLoanColumns.filter(
    (loan) => loan.outstandingPrincipalBalance > 0
  )
  const historicalLoanCount =
    new Set(
      displayedLedgerRows.flatMap((row) =>
        row.loanColumns.map((loan) => loan.id)
      )
    ).size || selectedMemberLegacyLoanDrafts.length
  const activeLoanBalance = activeLoanColumns.reduce(
    (total, loan) => total + loan.outstandingPrincipalBalance,
    0
  )
  const loanStatusLabel =
    activeLoanColumns.length > 0
      ? `${activeLoanColumns.length} active • ${formatCurrency(activeLoanBalance)}`
      : historicalLoanCount > 0
        ? "Settled"
        : "No loan"
  const selectedMemberHeadline = selectedMemberReview
    ? {
        fullName: selectedMemberReview.fullName,
        joinedAt: selectedMemberReview.joinedAt,
        memberNumber: selectedMemberReview.memberNumber,
      }
    : selectedMigrationMemberLabel
      ? {
          fullName: selectedMigrationMemberLabel,
          joinedAt: null,
          memberNumber: null,
        }
      : null
  const readinessDetail = migrationSnapshot
    ? `${migrationSnapshot.completedStepCount} of ${migrationSnapshot.totalStepCount} steps done`
    : "Real cooperative readiness will appear here."
  const blockingFinalizationSteps =
    migrationSnapshot?.missingStepKeys.filter(
      (stepKey) => stepKey !== "finalization"
    ) ?? []
  const blockingFinalizationLabels =
    migrationSnapshot?.steps
      .filter((step) => blockingFinalizationSteps.includes(step.key as never))
      .map((step) => step.label) ?? []
  const memberBackfillBlockingStepKeys =
    migrationSnapshot?.missingStepKeys.filter(
      (stepKey) =>
        stepKey === "finance_start_date" ||
        stepKey === "charge_schedules" ||
        stepKey === "business_profit_pools" ||
        stepKey === "business_profit_seasons" ||
        stepKey === "legacy_loans" ||
        stepKey === "member_profiles"
    ) ?? []
  const memberBackfillBlockingLabels =
    migrationSnapshot?.steps
      .filter((step) =>
        memberBackfillBlockingStepKeys.includes(step.key as never)
      )
      .map((step) => step.label) ?? []
  const memberProfileBlockingStepKeys =
    migrationSnapshot?.missingStepKeys.filter(
      (stepKey) =>
        stepKey === "finance_start_date" || stepKey === "charge_schedules"
    ) ?? []
  const memberProfileBlockingLabels =
    migrationSnapshot?.steps
      .filter((step) =>
        memberProfileBlockingStepKeys.includes(step.key as never)
      )
      .map((step) => step.label) ?? []
  const canEditMemberMigrationInputs =
    Boolean(migrationSnapshot?.canUseMigrationTools) &&
    !migrationSnapshot?.canUseLiveFinancialWrites
  const canCreateMigrationMemberProfile =
    Boolean(migrationSnapshot?.canUseMigrationTools) &&
    !migrationSnapshot?.canUseLiveFinancialWrites &&
    memberProfileBlockingStepKeys.length === 0 &&
    appliedBackfillMembers === 0
  // The sheet opens while migration is still in progress so the go-live
  // checklist can show what is missing; its "Go live" button stays disabled
  // until every check is Ready.
  const canOpenGoLiveChecklist =
    Boolean(migrationSnapshot?.canUseMigrationTools) &&
    !migrationSnapshot?.canUseLiveFinancialWrites
  const finalizationWarnings = [
    blockingFinalizationLabels.length > 0
      ? `Still to do: ${blockingFinalizationLabels.join(", ")}.`
      : null,
    membersMissingAppliedBackfill > 0
      ? `${membersMissingAppliedBackfill} ${membersMissingAppliedBackfill === 1 ? "member's" : "members'"} past records not added yet.`
      : null,
    activeLegacyLoanDrafts.length > 0
      ? `${activeLegacyLoanDrafts.length} old ${activeLegacyLoanDrafts.length === 1 ? "loan needs" : "loans need"} checking before you go live.`
      : null,
  ].filter((warning): warning is string => Boolean(warning))
  const renderLedgerBackfillActions = (
    className = "flex flex-wrap items-end gap-2"
  ) => {
    if (selectedMemberBackfillApplied) {
      return <TrendPill tone="positive">Added</TrendPill>
    }

    if (!selectedMigrationMemberId || displayedLedgerRows.length === 0) {
      return null
    }

    return (
      <div className={className}>
        <SaveBackfillDraftButton memberId={selectedMigrationMemberId} />
        <MigrationActionTrigger
          label="Add to member's records"
          mode="apply"
          variant="default"
        />
      </div>
    )
  }
  const ledgerBackfillSection = (
    <div className="mt-5 scroll-mt-24 space-y-3" id="member-ledger-backfill">
      <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Month by month
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Made from the history above. Check each month, then add them to the
            member’s records.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <TrendPill tone={segments.length > 0 ? "positive" : "warning"}>
            {segments.length > 0
              ? `${displayedLedgerRows.length} ${displayedLedgerRows.length === 1 ? "month" : "months"}`
              : "No months yet"}
          </TrendPill>
          {renderLedgerBackfillActions()}
        </div>
      </div>
      {generatedLedgerError ? (
        <div className="border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p className="font-medium">Could not work out the months</p>
          <p className="mt-1 text-xs">{generatedLedgerError}</p>
        </div>
      ) : null}
      {selectedMigrationMemberId && !selectedMemberBackfillApplied ? (
        <MigrationActionOverlay
          description="These months become the member's records. After this, their past records can't be changed here."
          mode="apply"
          title="Add to member's records?"
        >
          <ApplyMemberBackfillContent memberId={selectedMigrationMemberId} />
        </MigrationActionOverlay>
      ) : null}
      {selectedMigrationMemberId ? (
        <MemberBackfillCellEditors
          disabled={Boolean(selectedMemberBackfillApplied)}
          memberId={selectedMigrationMemberId}
          rows={displayedLedgerRows}
        />
      ) : null}
      {selectedMigrationMemberId ? (
        <MemberLedgerBackfillTable
          isRowAdjustmentDisabled={(row) =>
            !selectedMigrationMemberId ||
            !row.month ||
            selectedMemberBackfillApplied
          }
          renderRepaymentControl={(row, loan, disabled) => (
            <MemberBackfillAdjustmentButton
              disabled={disabled}
              loan={loan}
              memberId={selectedMigrationMemberId}
              mode="repayment"
              month={row.month}
              savingsContribution={row.savingsContribution}
            />
          )}
          renderSavingsControl={(row, _loans, disabled) => (
            <MemberBackfillAdjustmentButton
              disabled={disabled}
              memberId={selectedMigrationMemberId}
              mode="savings"
              month={row.month}
              savingsContribution={row.savingsContribution}
            />
          )}
          renderDefaultingControl={(row, disabled, triggerLabel) => (
            <DefaultingMonthsButton
              disabled={disabled}
              memberId={selectedMigrationMemberId}
              selectedMonth={row.month}
              triggerLabel={triggerLabel}
              triggerVariant={
                triggerLabel === "Missed or paused months" ? "default" : "ghost"
              }
            />
          )}
          renderMonthStatusControl={(row, disabled) => (
            <MonthStatusControl
              disabled={disabled}
              memberId={selectedMigrationMemberId}
              row={row}
              rows={displayedLedgerRows}
            />
          )}
          segments={segments}
        />
      ) : (
        <div className="border border-border/70 bg-muted/20 p-4">
          <p className="text-sm font-semibold text-foreground">
            Pick a member to see their months.
          </p>
        </div>
      )}
      {selectedMigrationMemberId ? (
        <div className="flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Checked every month? Add them, or save and come back later.
          </p>
          {renderLedgerBackfillActions(
            "flex flex-wrap items-end justify-end gap-2"
          )}
        </div>
      ) : null}
    </div>
  )

  return (
    <section>
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold text-foreground">
          {isLoansOnly
            ? "Loans from before Halaalvest"
            : isMemberPreview
              ? "This member's past records"
              : "Opening balances"}
        </h2>
        <p className="text-base text-muted-foreground">
          {isLoansOnly
            ? "Loans members still owed when you started. Add each one before adding members' past records."
            : isMemberPreview
              ? "Their past savings, loans and profit. Check the records it makes, then add them."
              : "Bring in each member's past records, check them, then go live."}
        </p>
      </div>

      {isMigrationOverview && migrationSnapshot ? (
        <p
          className={`mt-4 rounded-(--ui-radius-control) border px-4 py-3 text-base ${
            memberBackfillBlockingLabels.length > 0
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-border bg-muted/50 text-foreground"
          }`}
        >
          {memberBackfillBlockingLabels.length > 0
            ? `Still to do first: ${memberBackfillBlockingLabels.join(", ")}.`
            : `Ready. Pick a member to check their past records. ${readinessDetail}.`}
        </p>
      ) : null}

      {isMigrationOverview ? (
        <section
          className="mt-5 scroll-mt-24 border-t border-border/70 pt-4"
          id="member-backfill-preview"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {hasSelectedMigrationOverviewMember
                  ? "This member"
                  : "Check one member"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasSelectedMigrationOverviewMember
                  ? "Their months are below."
                  : "Pick a member to see their past records month by month."}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {canCreateMigrationMemberProfile ? (
                <MemberCreateSheet
                  cooperativeStartDate={tenantStartDate}
                  description="Add the member first, then their past records."
                  devMode={quickFillEnabled}
                  memberNumberPrefix={memberNumberPrefix}
                  title="Add a member"
                  triggerLabel="Add a member"
                />
              ) : null}
              <MemberPreviewPicker
                memberOptions={memberOptions ?? []}
                selectedMemberId={selectedMigrationMemberId}
              />
            </div>
          </div>

          {!canCreateMigrationMemberProfile &&
          !hasSelectedMigrationOverviewMember &&
          memberProfileBlockingLabels.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              You can add members after:{" "}
              {memberProfileBlockingLabels.join(", ")}.
            </p>
          ) : null}

          {hasSelectedMigrationOverviewMember && selectedMemberHeadline ? (
            <div className="mt-4 grid gap-3 border-t border-border/70 pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Member
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {selectedMemberHeadline.fullName}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Member number
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {selectedMemberHeadline.memberNumber ?? "Not available"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Joined
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {selectedMemberHeadline.joinedAt ?? "Not available"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  First saving plan
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {firstLedgerRow
                    ? `${formatCurrency(firstLedgerRow.savingsContribution)} from ${firstLedgerRow.period}`
                    : "Not worked out yet"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total savings
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {latestLedgerRow
                    ? formatCurrency(projectedTotalSavings)
                    : "Not worked out yet"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total shares
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {latestLedgerRow
                    ? formatCurrency(projectedShareCapital)
                    : "Not worked out yet"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Loan status
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {loanStatusLabel}
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {isMemberPreview ? (
        <section className="mt-5 space-y-4">
          {selectedMemberHeadline ? (
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-7">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Member
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {selectedMemberHeadline.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Member number
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {selectedMemberHeadline.memberNumber ?? "Not available"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Joined
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {selectedMemberHeadline.joinedAt ?? "Not available"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    First saving plan
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {firstLedgerRow
                      ? `${formatCurrency(firstLedgerRow.savingsContribution)} from ${firstLedgerRow.period}`
                      : "Not worked out yet"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total savings
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {latestLedgerRow
                      ? formatCurrency(projectedTotalSavings)
                      : "Not worked out yet"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total shares
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {latestLedgerRow
                      ? formatCurrency(projectedShareCapital)
                      : "Not worked out yet"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Loan status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {loanStatusLabel}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <MemberMigrationInputPanels
            activity={
              <ActivityHistoryPanel
                disabled={
                  !hasRealMigrationContext ||
                  !canEditMemberMigrationInputs ||
                  selectedMemberBackfillApplied
                }
                events={displayedMemberActivityEvents}
                memberId={selectedMigrationMemberId}
                memberJoinedAt={selectedMemberHeadline?.joinedAt ?? null}
              />
            }
            commitment={
              <CommitmentHistoryPanel
                disabled={
                  !hasRealMigrationContext ||
                  !canEditMemberMigrationInputs ||
                  selectedMemberBackfillApplied
                }
                memberAmountLogs={displayedMemberAmountLogs}
                memberId={selectedMigrationMemberId}
                memberJoinedAt={selectedMemberHeadline?.joinedAt ?? null}
              />
            }
            loan={
              <LoanHistoryPanel
                cooperativeStartDate={tenantStartDate}
                disabled={
                  !hasRealMigrationContext ||
                  !canEditMemberMigrationInputs ||
                  selectedMemberBackfillApplied
                }
                loans={selectedMemberLegacyLoanDrafts}
                memberId={selectedMigrationMemberId}
                memberJoinedAt={selectedMemberHeadline?.joinedAt ?? null}
                memberNumberPrefix={memberNumberPrefix}
                memberOptions={memberOptions ?? []}
                quickFillEnabled={quickFillEnabled}
              />
            }
            profit={
              <BusinessProfitMigrationPanel
                disabled={
                  !hasRealMigrationContext ||
                  !canEditMemberMigrationInputs ||
                  selectedMemberBackfillApplied
                }
                memberId={selectedMigrationMemberId}
                options={displayedProfitMigrationOptions}
              />
            }
          />
          {ledgerBackfillSection}
        </section>
      ) : null}

      {isMigrationOverview && !hasSelectedMigrationOverviewMember ? (
        <section
          className="mt-6 scroll-mt-24 border-t border-border/70 pt-4"
          id="finalization-review"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Ready to go live?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add every member’s past records first. After going live, past
                records can’t be changed here.
              </p>
            </div>
            <TrendPill tone="neutral">
              {appliedBackfillMembers} of {reviewRows.length} added
            </TrendPill>
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div className="border-l border-border/70 pl-3">
              <p className="text-xs font-medium text-muted-foreground">
                Members
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {reviewRows.length}
              </p>
            </div>
            <div className="border-l border-border/70 pl-3">
              <p className="text-xs font-medium text-muted-foreground">
                Past records added
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {appliedBackfillMembers}/{reviewRows.length}
              </p>
            </div>
            <div className="border-l border-border/70 pl-3">
              <p className="text-xs font-medium text-muted-foreground">
                Still to add
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {membersMissingAppliedBackfill}
              </p>
            </div>
          </div>
          <div
            className={`mt-4 border-l-2 px-3 py-2 text-xs ${
              finalizationWarnings.length > 0
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900"
            }`}
          >
            {finalizationWarnings.length > 0 ? (
              <div className="space-y-1">
                {finalizationWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : (
              <p>Everything is ready.</p>
            )}
          </div>
          <div className="mt-4 border-t border-border/70 pt-4">
            <MigrationActionSheet
              description="Check each item, confirm the balances, then start live operations. Setup tools close once you go live."
              disabled={!canOpenGoLiveChecklist}
              mode="finalize"
              title="Go live"
              triggerLabel="Go live"
              variant="default"
            >
              {migrationSnapshot ? (
                <FinalizeInitialMigrationContent
                  checklist={goLiveChecklist}
                  migrationSnapshot={migrationSnapshot}
                  tenantHost={tenantHost}
                  tenantName={tenantName ?? "your cooperative"}
                />
              ) : null}
            </MigrationActionSheet>
          </div>
        </section>
      ) : null}

      {isLoansOnly ? (
        <DashboardSurfaceCard
          as="section"
          className="mt-5 scroll-mt-24 bg-background/70"
          id="legacy-loans"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Old loans</p>
              <p className="mt-1 text-xs text-muted-foreground">
                What each member still owed, what they paid back each month and
                what they saved while paying.
              </p>
            </div>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {!legacyLoansReviewed && displayedLegacyLoanDrafts.length === 0 ? (
              <MigrationActionSheet
                description="Say that no member owed a loan when you started. This is recorded."
                mode="noHistory"
                title="No old loans?"
                triggerLabel="No old loans"
              >
                <MarkLegacyLoansReviewedContent />
              </MigrationActionSheet>
            ) : null}
            {mutableMigrationMemberOptions.length === 0 ? null : (
              <MigrationActionSheet
                description="What the member still owed when you started (the amount borrowed, without profit)."
                mode="legacyLoanCreate"
                title="Add an old loan"
                triggerLabel="Add an old loan"
                variant="default"
              >
                <CreateLegacyLoanMigrationDraftContent
                  memberOptions={mutableMigrationMemberOptions}
                />
              </MigrationActionSheet>
            )}
          </div>
          {!legacyLoansReviewed && displayedLegacyLoanDrafts.length === 0 ? (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
              <div>
                <p className="text-sm font-semibold">
                  No member owed a loan when you started?
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  Choose “No old loans” before adding members’ past records.
                </p>
              </div>
            </div>
          ) : null}
          {mutableMigrationMemberOptions.length === 0 ? (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Old loans can’t be added now</p>
              <p className="mt-1">
                Every member’s past records are already added.
              </p>
            </div>
          ) : null}
          {displayedLegacyLoanDrafts.length === 0 ? (
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <p className="text-sm font-semibold text-foreground">
                No old loans yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add one for each member who still owed a loan when you started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedLegacyLoanDrafts.map((loan) => (
                <DashboardSurfaceCard
                  as="article"
                  className="rounded-lg"
                  key={loan.id}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_10rem_10rem_10rem_10rem_8rem_auto] xl:items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Loan date</p>
                      <p className="text-sm font-medium text-foreground">
                        {loan.openedAt}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {loan.memberName} · {loan.memberNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Principal</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(loan.principalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Monthly repayment
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(
                          loan.scheduledMonthlyPrincipalRepayment
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Savings during loan
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(loan.savingsDuringLoan)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Outstanding
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(loan.outstandingPrincipalBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <div className="mt-1">
                        <TrendPill
                          tone={
                            loan.outstandingPrincipalBalance > 0
                              ? "warning"
                              : "positive"
                          }
                        >
                          {loan.status}
                        </TrendPill>
                      </div>
                    </div>
                    <div className="flex justify-start xl:justify-end">
                      <LegacyLoanDraftEditSheet
                        disabled={
                          !hasRealMigrationContext ||
                          !mutableMigrationMemberIds.has(loan.memberId)
                        }
                        loan={loan}
                        memberOptions={memberOptions ?? []}
                      />
                    </div>
                  </div>
                </DashboardSurfaceCard>
              ))}
            </div>
          )}
        </DashboardSurfaceCard>
      ) : null}

      {isMigrationOverview && hasSelectedMigrationOverviewMember
        ? ledgerBackfillSection
        : null}
    </section>
  )
}
