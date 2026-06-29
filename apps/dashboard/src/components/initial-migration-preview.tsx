import {
  groupRowsByEffectiveDateSegment,
  type MemberLedgerBackfillRow,
} from "@halaalvest/backfill"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@halaalvest/ui/components/dialog"
import { Input } from "@halaalvest/ui/components/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardDataTable,
  DashboardSectionHeader,
  DashboardSurfaceCard,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TrendPill,
} from "@/components/dashboard"
import { DatePickerInput } from "@/components/date-picker-input"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { MemberPreviewPicker } from "@/components/migration/member-preview-picker"
import { MemberLedgerBackfillTable } from "@/components/migration/member-ledger-backfill-table"
import { MemberAutocompleteSelect } from "@/components/migration/member-autocomplete-select"
import {
  CommitmentHistoryEntryForm,
  LoanHistoryEntryForm,
} from "@/components/migration/member-migration-history-forms"
import { MemberMigrationInputPanels } from "@/components/migration/member-migration-input-panels"
import { MissedMonthsRangeGrid } from "@/components/migration/missed-months-range-grid"
import { MemberCreateModal } from "@/components/modals/member-create-modal"
import {
  createLegacyLoanMigrationDraftAction,
  finalizeInitialMigrationAction,
  markLegacyLoansReviewedAction,
  deleteMemberActivityEventAction,
  queueBackfillApplyAction,
  queueBackfillDraftAction,
  setMigrationBackfillDefaultingMonthsAction,
  updateLegacyLoanMigrationDraftAction,
  upsertMemberActivityEventAction,
  upsertMigrationBackfillAdjustmentAction,
  upsertMigrationProfitAdjustmentAction,
} from "@/lib/dashboard-actions"

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

function formatGuarantorMember(
  memberId: string | null | undefined,
  memberOptions: MemberOption[]
) {
  if (!memberId) {
    return "None"
  }

  return (
    memberOptions.find((member) => member.id === memberId)?.label ?? memberId
  )
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
  totalDisbursedAmount: number
}

const statusLabels: Record<InitialMigrationSnapshot["status"], string> = {
  finalized: "Finalized",
  historical_setup_in_progress: "Historical setup",
  live_operations: "Live operations",
  member_migration_in_progress: "Member migration",
  migration_review: "Migration review",
  not_started: "Not started",
}

function MemberBackfillAdjustmentDialog({
  disabled,
  loan,
  loans,
  memberId,
  mode,
  month,
  period,
  savingsContribution,
}: {
  disabled: boolean
  loan?: MemberLedgerBackfillRow["loanColumns"][number]
  loans?: MemberLedgerBackfillRow["loanColumns"]
  memberId: string | null | undefined
  mode: "repayment" | "savings"
  month?: string
  period: string
  savingsContribution: number
}) {
  const isRepayment = mode === "repayment"
  const activeLoans = loans ?? (loan ? [loan] : [])
  const activeLoanBalance = activeLoans.reduce(
    (sum, item) => sum + item.outstandingPrincipalBalance,
    0
  )
  const triggerLabel = isRepayment
    ? loan
      ? formatCurrency(loan.repaymentAmount)
      : "-"
    : formatCurrency(savingsContribution)
  const isDisabled = disabled || !memberId || !month || (isRepayment && !loan)

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            className="h-auto rounded-md px-2 py-1 text-right font-medium text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
            disabled={isDisabled}
            size="sm"
            variant="ghost"
          />
        }
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            One-time migration adjustment
          </p>
          <DialogTitle>
            {isRepayment ? "Edit loan repayment" : "Edit savings"} for {period}
          </DialogTitle>
          <DialogDescription>
            Save a month-specific override. The generated ledger will recompute
            segments from this month while preserving the saved migration
            history.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Current savings</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatCurrency(savingsContribution)}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {activeLoans.length > 1 ? "Total loan balance" : "Loan balance"}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {activeLoans.length > 0
                ? formatCurrency(activeLoanBalance)
                : "No active loan"}
            </p>
            {activeLoans.length > 1 ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {activeLoans.length} active loans in this period
              </p>
            ) : null}
          </div>
        </div>

        <form
          action={upsertMigrationBackfillAdjustmentAction}
          className="grid gap-3"
        >
          <input name="memberId" type="hidden" value={memberId ?? ""} />
          <input name="month" type="hidden" value={month ?? ""} />
          {isRepayment ? (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Actual principal repayment
                <CurrencyPrefixInput
                  defaultValue={loan?.repaymentAmount ?? ""}
                  disabled={isDisabled}
                  min="0"
                  name="loanRepaymentAmount"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="flex h-9 items-center gap-2 border border-border/70 bg-background px-3 text-sm text-foreground">
                <Checkbox
                  defaultChecked={loan?.repaymentOnTime ?? false}
                  disabled={isDisabled}
                  name="loanRepaymentOnTime"
                />
                Mark repayment as on-time
              </label>
            </>
          ) : (
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Actual savings contribution
              <CurrencyPrefixInput
                defaultValue={savingsContribution}
                disabled={isDisabled}
                min="0"
                name="savingsContribution"
                required
                step="0.01"
                type="number"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Notes
            <Input
              disabled={isDisabled}
              name="notes"
              placeholder="Receipt, board note, or source file reference"
              type="text"
            />
          </label>
          <div className="flex justify-end">
            <Button disabled={isDisabled} size="sm" type="submit">
              Save adjustment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
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
            Business profit migration
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Assign historical business profit to this member so it appears in
            the generated ledger table.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-muted-foreground">Selected member total</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(totalMemberProfit)}
          </p>
        </div>
      </div>

      <DashboardDataTable>
        <DashboardTable className="min-w-[940px]">
          <DashboardTableHead>
            <DashboardTableHeaderCell>Date</DashboardTableHeaderCell>
            <DashboardTableHeaderCell>Business</DashboardTableHeaderCell>
            <DashboardTableHeaderCell align="right">
              Shareable
            </DashboardTableHeaderCell>
            <DashboardTableHeaderCell align="right">
              Assigned
            </DashboardTableHeaderCell>
            <DashboardTableHeaderCell align="right">
              Available
            </DashboardTableHeaderCell>
            <DashboardTableHeaderCell align="right">
              Member amount *
            </DashboardTableHeaderCell>
            <DashboardTableHeaderCell align="right">
              Action
            </DashboardTableHeaderCell>
          </DashboardTableHead>
          <DashboardTableBody>
            {options.map((option) => {
              const formId = `profit-migration-${option.id}`
              const rowDisabled =
                disabled ||
                !memberId ||
                (option.editableAvailableAmount <= 0 &&
                  option.memberMigrationAdjustmentAmount <= 0)

              return (
                <DashboardTableRow key={option.id}>
                  <DashboardTableCell>{option.profitDate}</DashboardTableCell>
                  <DashboardTableCell>
                    <p className="font-medium">{option.businessName}</p>
                    <p className="text-xs text-muted-foreground">
                      Gross {formatCurrency(option.profitAmount)} · deduction{" "}
                      {formatCurrency(option.expenseAmount)}
                    </p>
                  </DashboardTableCell>
                  <DashboardTableCell align="right">
                    {formatCurrency(option.allocatableProfitAmount)}
                  </DashboardTableCell>
                  <DashboardTableCell align="right">
                    <p>{formatCurrency(option.memberAllocatedAmount)}</p>
                    {option.memberPublishedAllocationAmount > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(option.memberPublishedAllocationAmount)}{" "}
                        published
                      </p>
                    ) : null}
                  </DashboardTableCell>
                  <DashboardTableCell align="right">
                    <p>{formatCurrency(option.editableAvailableAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(option.totalDisbursedAmount)} disbursed
                    </p>
                  </DashboardTableCell>
                  <DashboardTableCell align="right">
                    <form
                      action={upsertMigrationProfitAdjustmentAction}
                      id={formId}
                    >
                      <input
                        name="memberId"
                        type="hidden"
                        value={memberId ?? ""}
                      />
                      <input
                        name="profitEntryId"
                        type="hidden"
                        value={option.id}
                      />
                      <input
                        name="notes"
                        type="hidden"
                        value="Initial migration profit allocation"
                      />
                      <CurrencyPrefixInput
                        className="ml-auto w-36"
                        defaultValue={
                          option.memberMigrationAdjustmentAmount || ""
                        }
                        disabled={rowDisabled}
                        max={option.editableAvailableAmount}
                        min="0"
                        name="allocatedProfitAmount"
                        required
                        step="0.01"
                        type="number"
                      />
                    </form>
                  </DashboardTableCell>
                  <DashboardTableCell align="right">
                    <Button
                      disabled={rowDisabled}
                      form={formId}
                      size="sm"
                      type="submit"
                    >
                      Save
                    </Button>
                  </DashboardTableCell>
                </DashboardTableRow>
              )
            })}
          </DashboardTableBody>
        </DashboardTable>
      </DashboardDataTable>
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
        memberId={memberId}
        memberJoinedAt={memberJoinedAt}
      />

      <DashboardDataTable>
        <DashboardTable className="min-w-[420px]">
          <DashboardTableHead>
            <DashboardTableHeaderCell>Date</DashboardTableHeaderCell>
            <DashboardTableHeaderCell align="right">
              Amount
            </DashboardTableHeaderCell>
          </DashboardTableHead>
          <DashboardTableBody>
            {memberAmountLogs.length > 0 ? (
              memberAmountLogs.map((log) => (
                <DashboardTableRow key={log.id}>
                  <DashboardTableCell>{log.effectiveFrom}</DashboardTableCell>
                  <DashboardTableCell align="right">
                    {formatCurrency(log.amount)}
                  </DashboardTableCell>
                </DashboardTableRow>
              ))
            ) : (
              <DashboardTableRow>
                <DashboardTableCell className="text-muted-foreground">
                  No commitment history yet.
                </DashboardTableCell>
                <DashboardTableCell align="right">-</DashboardTableCell>
              </DashboardTableRow>
            )}
          </DashboardTableBody>
        </DashboardTable>
      </DashboardDataTable>
    </div>
  )
}

function LoanHistoryPanel({
  disabled,
  loans,
  memberId,
  memberJoinedAt,
  memberNumberPrefix,
  memberOptions,
}: {
  disabled: boolean
  loans: Array<LegacyLoanDraftRow & { status: string }>
  memberId: string | null | undefined
  memberJoinedAt?: string | null
  memberNumberPrefix?: string | null
  memberOptions: MemberOption[]
}) {
  return (
    <div className="space-y-3">
      <LoanHistoryEntryForm
        disabled={disabled}
        memberId={memberId}
        memberJoinedAt={memberJoinedAt}
        memberNumberPrefix={memberNumberPrefix}
        memberOptions={memberOptions}
      />
      <ItemGroup className="gap-2">
        {loans.length > 0 ? (
          loans.map((loan) => (
            <Item
              className="items-start gap-3 bg-background p-3 sm:flex-nowrap"
              key={loan.id}
              variant="outline"
            >
              <ItemContent className="min-w-48">
                <ItemTitle>{loan.loanLabel}</ItemTitle>
                <ItemDescription>
                  {loan.openedAt} · G1{" "}
                  {formatGuarantorMember(
                    loan.guarantorOneMemberId,
                    memberOptions
                  )}{" "}
                  · G2{" "}
                  {formatGuarantorMember(
                    loan.guarantorTwoMemberId,
                    memberOptions
                  )}
                </ItemDescription>
              </ItemContent>
              <div className="grid w-full gap-2 text-xs sm:w-auto sm:min-w-[26rem] sm:grid-cols-4 sm:text-right">
                <div>
                  <p className="text-muted-foreground">Principal</p>
                  <p className="mt-1 font-medium text-foreground">
                    {formatCurrency(loan.principalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Repayment</p>
                  <p className="mt-1 font-medium text-foreground">
                    {formatCurrency(loan.scheduledMonthlyPrincipalRepayment)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Commitment</p>
                  <p className="mt-1 font-medium text-foreground">
                    {formatCurrency(loan.savingsDuringLoan)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outstanding</p>
                  <p className="mt-1 font-medium text-foreground">
                    {formatCurrency(loan.outstandingPrincipalBalance)}
                  </p>
                </div>
              </div>
              <ItemActions className="ml-0 sm:ml-auto">
                <LegacyLoanDraftEditDialog
                  disabled={disabled}
                  loan={loan}
                  memberOptions={memberOptions}
                />
              </ItemActions>
            </Item>
          ))
        ) : (
          <Item className="bg-muted/30 p-3" variant="muted">
            <ItemContent>
              <ItemTitle>No loan history yet.</ItemTitle>
              <ItemDescription>
                Add a historical loan above when this member has an opening
                loan balance.
              </ItemDescription>
            </ItemContent>
          </Item>
        )}
      </ItemGroup>
    </div>
  )
}

function LegacyLoanDraftEditDialog({
  disabled,
  loan,
  memberOptions,
}: {
  disabled: boolean
  loan: LegacyLoanDraftRow & { status: string }
  memberOptions: MemberOption[]
}) {
  const guarantorOptions = memberOptions.filter(
    (member) => member.id !== loan.memberId
  )

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            className="rounded-full"
            disabled={disabled}
            size="sm"
            variant="outline"
          />
        }
      >
        Edit loan
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Legacy loan draft
          </p>
          <DialogTitle>Edit {loan.loanLabel}</DialogTitle>
          <DialogDescription>
            Update the principal-only opening loan position before member ledger
            backfill is applied.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">
            {loan.memberName} · {loan.memberNumber}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            These values feed the generated loan repayment, savings-during-loan,
            and principal balance columns.
          </p>
        </div>

        <form
          action={updateLegacyLoanMigrationDraftAction}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input name="draftId" type="hidden" value={loan.id} />
          <input name="memberId" type="hidden" value={loan.memberId} />
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Loan label
            <Input
              defaultValue={loan.loanLabel}
              name="loanLabel"
              required
              type="text"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Loan date
            <DatePickerInput
              defaultValue={loan.openedAt}
              name="openedAt"
              placeholder="Select loan date"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Closed date
            <DatePickerInput
              defaultValue={loan.closedAt ?? ""}
              name="closedAt"
              placeholder="Select closed date"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Principal
            <CurrencyPrefixInput
              defaultValue={loan.principalAmount}
              min="0"
              name="principalAmount"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Monthly principal repayment
            <CurrencyPrefixInput
              defaultValue={loan.scheduledMonthlyPrincipalRepayment}
              min="0"
              name="scheduledMonthlyPrincipalRepayment"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Savings during loan
            <CurrencyPrefixInput
              defaultValue={loan.savingsDuringLoan}
              min="0"
              name="savingsDuringLoan"
              required
              step="0.01"
              type="number"
            />
          </label>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">
              Guarantor 1
            </span>
            <MemberAutocompleteSelect
              label="Guarantor 1"
              name="guarantorOneMemberId"
              options={guarantorOptions}
              placeholder="Search member"
              value={loan.guarantorOneMemberId}
            />
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">
              Guarantor 2
            </span>
            <MemberAutocompleteSelect
              label="Guarantor 2"
              name="guarantorTwoMemberId"
              options={guarantorOptions}
              placeholder="Search member"
              value={loan.guarantorTwoMemberId}
            />
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Outstanding principal
            <CurrencyPrefixInput
              defaultValue={loan.outstandingPrincipalBalance}
              min="0"
              name="outstandingPrincipalBalance"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
            Notes
            <Input
              name="notes"
              placeholder="Board approval, source file, or correction note"
              type="text"
            />
          </label>
          <div className="flex justify-end sm:col-span-2">
            <Button disabled={disabled} size="sm" type="submit">
              Save loan draft
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DefaultingMonthsDialog({
  disabled,
  memberId,
  rows,
  selectedMonth,
  triggerVariant = "ghost",
  triggerLabel = "Missed months",
}: {
  disabled: boolean
  memberId: string | null | undefined
  rows: MemberLedgerBackfillRow[]
  selectedMonth?: string
  triggerLabel?: string
  triggerVariant?: "default" | "ghost"
}) {
  const usableRows = rows.filter((row) => row.month)

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            disabled={disabled || !memberId}
            size="xs"
            type="button"
            variant={triggerVariant}
          />
        }
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-none sm:w-[min(96vw,96rem)] sm:max-w-none">
        <DialogHeader>
          <div>
            <DialogTitle>Missed commitment months</DialogTitle>
            <DialogDescription>
              Toggle months where this member made no commitment during
              migration. These months will not add savings, share capital, or
              charges.
            </DialogDescription>
          </div>
        </DialogHeader>
        <form
          action={setMigrationBackfillDefaultingMonthsAction}
          className="space-y-4"
        >
          <input name="memberId" type="hidden" value={memberId ?? ""} />
          <MissedMonthsRangeGrid
            disabled={disabled}
            rows={usableRows.map((row) => ({
              month: row.month ?? "",
              period: row.period,
              savingsContribution: row.savingsContribution,
              status: row.status,
            }))}
            selectedMonth={selectedMonth}
          />
          <div className="flex justify-end">
            <Button disabled={disabled || !memberId} size="sm" type="submit">
              Save missed months
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MonthStatusControl({
  disabled,
  memberId,
  row,
  rows,
}: {
  disabled: boolean
  memberId: string | null | undefined
  row: MemberLedgerBackfillRow
  rows: MemberLedgerBackfillRow[]
}) {
  const usableRows = rows.filter((candidate) => candidate.month)
  const targetMonth = row.month
  const isMissed = row.status === "missed"

  function defaultingMonthsFor(nextStatus: "committed" | "missed") {
    return usableRows
      .filter((candidate) => {
        if (candidate.month === targetMonth) {
          return nextStatus === "missed"
        }

        return candidate.status === "missed"
      })
      .map((candidate) => candidate.month)
      .filter((month): month is string => Boolean(month))
  }

  return (
    <div className="flex items-center gap-1">
      {(["committed", "missed"] as const).map((nextStatus) => {
        const active =
          nextStatus === "missed" ? isMissed : row.status !== "missed"

        return (
          <form
            action={setMigrationBackfillDefaultingMonthsAction}
            key={nextStatus}
          >
            <input name="memberId" type="hidden" value={memberId ?? ""} />
            {usableRows.map((candidate) => (
              <input
                key={candidate.month}
                name="month"
                type="hidden"
                value={candidate.month ?? ""}
              />
            ))}
            {defaultingMonthsFor(nextStatus).map((month) => (
              <input
                key={month}
                name="defaultingMonth"
                type="hidden"
                value={month}
              />
            ))}
            <Button
              disabled={disabled || !memberId || !targetMonth}
              size="xs"
              type="submit"
              variant={active ? "secondary" : "ghost"}
            >
              {nextStatus === "missed" ? "Missed" : "Committed"}
            </Button>
          </form>
        )
      })}
    </div>
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
  const minMonth = memberJoinedAt?.slice(0, 7)

  return (
    <div>
      <form
        action={upsertMemberActivityEventAction}
        className="mb-3 grid gap-3 rounded-lg border border-border/70 bg-background p-3 sm:grid-cols-[150px_150px_minmax(160px,1fr)_auto]"
      >
        <input name="memberId" type="hidden" value={memberId ?? ""} />
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Month
          <Input
            disabled={disabled || !memberId}
            min={minMonth}
            name="effectiveMonth"
            required
            type="month"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Status
          <LabeledSelectInput
            defaultValue="inactive"
            disabled={disabled || !memberId}
            name="status"
            options={[
              { label: "Inactive", value: "inactive" },
              { label: "Active again", value: "active" },
            ]}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Reason
          <Input
            disabled={disabled || !memberId}
            name="reason"
            placeholder="Inactive, resumed, leave, transfer"
            type="text"
          />
        </label>
        <div className="flex items-end justify-end">
          <Button disabled={disabled || !memberId} size="sm" type="submit">
            Save activity
          </Button>
        </div>
      </form>

      <DashboardDataTable>
        <DashboardTable className="min-w-[560px]">
          <DashboardTableHead>
            <DashboardTableHeaderCell>Month</DashboardTableHeaderCell>
            <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
            <DashboardTableHeaderCell>Reason</DashboardTableHeaderCell>
            <DashboardTableHeaderCell align="right">
              Action
            </DashboardTableHeaderCell>
          </DashboardTableHead>
          <DashboardTableBody>
            {events.length > 0 ? (
              events.map((event) => (
                <DashboardTableRow key={event.id}>
                  <DashboardTableCell>
                    {event.effectiveMonth.slice(0, 7)}
                  </DashboardTableCell>
                  <DashboardTableCell>
                    {event.status === "inactive" ? "Inactive" : "Active again"}
                  </DashboardTableCell>
                  <DashboardTableCell>
                    {event.reason || event.notes || "-"}
                  </DashboardTableCell>
                  <DashboardTableCell align="right">
                    <form action={deleteMemberActivityEventAction}>
                      <input
                        name="memberId"
                        type="hidden"
                        value={memberId ?? ""}
                      />
                      <input name="eventId" type="hidden" value={event.id} />
                      <Button
                        disabled={disabled || !memberId}
                        size="xs"
                        type="submit"
                        variant="ghost"
                      >
                        Remove
                      </Button>
                    </form>
                  </DashboardTableCell>
                </DashboardTableRow>
              ))
            ) : (
              <DashboardTableRow>
                <DashboardTableCell className="text-muted-foreground">
                  No activity windows yet.
                </DashboardTableCell>
                <DashboardTableCell>-</DashboardTableCell>
                <DashboardTableCell>-</DashboardTableCell>
                <DashboardTableCell align="right">-</DashboardTableCell>
              </DashboardTableRow>
            )}
          </DashboardTableBody>
        </DashboardTable>
      </DashboardDataTable>
    </div>
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
  selectedMigrationMemberId,
  selectedMigrationMemberLabel,
  section = "overview",
}: {
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
  selectedMigrationMemberId?: string | null
  selectedMigrationMemberLabel?: string | null
  section?: "loans" | "member-preview" | "overview"
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
  const migrationStatus = migrationSnapshot
    ? statusLabels[migrationSnapshot.status]
    : "Preview mode"
  const readinessDetail = migrationSnapshot
    ? `${migrationSnapshot.completedStepCount}/${migrationSnapshot.totalStepCount} steps complete`
    : "Real tenant readiness will appear here."
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
        stepKey === "share_capital_plan" ||
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
        stepKey === "finance_start_date" ||
        stepKey === "charge_schedules" ||
        stepKey === "share_capital_plan"
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
  const canFinalizeMigration =
    Boolean(migrationSnapshot?.canUseMigrationTools) &&
    !migrationSnapshot?.canUseLiveFinancialWrites &&
    blockingFinalizationSteps.length === 0
  const finalizationWarnings = [
    blockingFinalizationLabels.length > 0
      ? `Missing setup: ${blockingFinalizationLabels.join(", ")}.`
      : null,
    membersMissingAppliedBackfill > 0
      ? `${membersMissingAppliedBackfill} member backfill record(s) are not applied.`
      : null,
    activeLegacyLoanDrafts.length > 0
      ? `${activeLegacyLoanDrafts.length} active opening loan position(s) need review before go-live.`
      : null,
  ].filter((warning): warning is string => Boolean(warning))
  const renderLedgerBackfillActions = (className = "flex flex-wrap items-end gap-2") => {
    if (selectedMemberBackfillApplied) {
      return <TrendPill tone="positive">Applied</TrendPill>
    }

    if (!selectedMigrationMemberId || displayedLedgerRows.length === 0) {
      return null
    }

    return (
      <div className={className}>
        <form action={queueBackfillDraftAction}>
          <input
            name="memberId"
            type="hidden"
            value={selectedMigrationMemberId}
          />
          <Button size="sm" type="submit" variant="outline">
            Save draft
          </Button>
        </form>
        <form
          action={queueBackfillApplyAction}
          className="flex flex-wrap items-end gap-2"
        >
          <input
            name="memberId"
            type="hidden"
            value={selectedMigrationMemberId}
          />
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Type APPLY BACKFILL
            <Input
              className="h-8 w-40"
              name="confirmation"
              placeholder="APPLY BACKFILL"
              required
              type="text"
            />
          </label>
          <Button size="sm" type="submit">
            Apply backfill
          </Button>
        </form>
      </div>
    )
  }
  const ledgerBackfillSection = (
    <div className="mt-5 scroll-mt-24 space-y-3" id="member-ledger-backfill">
      <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Ledger backfill
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Review generated member ledger rows after commitment and loan
            history are saved.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <TrendPill tone={segments.length > 0 ? "positive" : "warning"}>
            {segments.length > 0
              ? `${displayedLedgerRows.length} rows • ${segments.length} segments`
              : "No generated rows"}
          </TrendPill>
          <TrendPill tone="warning">After commitments and loans</TrendPill>
          {renderLedgerBackfillActions()}
        </div>
      </div>
      {generatedLedgerError ? (
        <div className="border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p className="font-medium">Could not generate ledger preview</p>
          <p className="mt-1 text-xs">{generatedLedgerError}</p>
        </div>
      ) : null}
      {selectedMigrationMemberId ? (
        <MemberLedgerBackfillTable
          isRowAdjustmentDisabled={(row) =>
            !selectedMigrationMemberId ||
            !row.month ||
            selectedMemberBackfillApplied
          }
          renderRepaymentControl={(row, loan, disabled) => (
            <MemberBackfillAdjustmentDialog
              disabled={disabled}
              loan={loan}
              memberId={selectedMigrationMemberId}
              mode="repayment"
              month={row.month}
              period={row.period}
              savingsContribution={row.savingsContribution}
            />
          )}
          renderSavingsControl={(row, loans, disabled) => (
            <MemberBackfillAdjustmentDialog
              disabled={disabled}
              loans={loans}
              memberId={selectedMigrationMemberId}
              mode="savings"
              month={row.month}
              period={row.period}
              savingsContribution={row.savingsContribution}
            />
          )}
          renderDefaultingControl={(row, disabled, triggerLabel) => (
            <DefaultingMonthsDialog
              disabled={disabled}
              memberId={selectedMigrationMemberId}
              rows={displayedLedgerRows}
              selectedMonth={row.month}
              triggerLabel={triggerLabel}
              triggerVariant={
                triggerLabel === "Commitment status" ? "default" : "ghost"
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
            Select a member to generate ledger backfill.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Commitment and loan history need a selected member before the
            generated ledger can be reviewed.
          </p>
        </div>
      )}
      {selectedMigrationMemberId ? (
        <div className="flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Save or apply after reviewing the generated ledger rows.
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
      <DashboardSectionHeader
        eyebrow="Initial migration"
        title={
          isLoansOnly
            ? "Legacy loan setup"
            : isMemberPreview
              ? "Member migration inputs"
              : "Migration overview"
        }
        description={
          isLoansOnly
            ? "Configure principal-only opening loan positions, monthly repayment, and savings during loan before member ledger backfill."
            : isMemberPreview
              ? "Save commitment history, loan history, activity windows, profit adjustments, and review the generated ledger."
              : "Track migration readiness and choose the next focused workflow without mixing member creation, loans, and generated ledger rows on one page."
        }
        actions={
          <>
            <TrendPill
              tone={
                isMigrationOverview || generatedLedgerRows?.length
                  ? "positive"
                  : "warning"
              }
            >
              {isLoansOnly
                ? "Loan domain"
                : isMemberPreview
                  ? generatedLedgerRows?.length
                    ? "Generated preview"
                    : "No preview"
                  : migrationStatus}
            </TrendPill>
            <TrendPill tone="neutral">
              {isMigrationOverview
                ? readinessDetail
                : "Principal-only loan balance"}
            </TrendPill>
          </>
        }
      />

      {isMigrationOverview && migrationSnapshot ? (
        <section
          className={`mt-4 border-l-2 px-3 py-2 text-sm ${
            memberBackfillBlockingLabels.length > 0
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-emerald-300 bg-emerald-50 text-emerald-950"
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {memberBackfillBlockingLabels.length > 0
                  ? "Setup blockers"
                  : "Ready for member preview"}
              </p>
              <p className="mt-1 text-xs">
                {memberBackfillBlockingLabels.length > 0
                  ? `Missing: ${memberBackfillBlockingLabels.join(", ")}.`
                  : "Select a member to review generated opening ledger rows."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TrendPill
                tone={
                  migrationSnapshot.canUseMigrationTools
                    ? "warning"
                    : "positive"
                }
              >
                {migrationSnapshot.canUseMigrationTools
                  ? "Migration tools open"
                  : "Migration tools locked"}
              </TrendPill>
              <TrendPill tone="neutral">{readinessDetail}</TrendPill>
            </div>
          </div>
        </section>
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
                  ? "Selected member preview"
                  : "Member backfill preview"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasSelectedMigrationOverviewMember
                  ? "Generated ledger rows are shown below."
                  : "Select a member to load the generated ledger preview here."}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {canCreateMigrationMemberProfile ? (
                <MemberCreateModal
                  description="Create the member profile before generating historical ledger rows."
                  devMode={process.env.NODE_ENV !== "production"}
                  eyebrow="Initial migration"
                  memberNumberPrefix={memberNumberPrefix}
                  title="Create migration member"
                  triggerLabel="Create member"
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
              Create member is locked until:{" "}
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
                  Member ID
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
                    : "Not generated"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total savings
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {latestLedgerRow
                    ? formatCurrency(projectedTotalSavings)
                    : "Not generated"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total shares
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {latestLedgerRow
                    ? formatCurrency(projectedShareCapital)
                    : "Not generated"}
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
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
                    Member ID
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
                      : "Not generated here"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total savings
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {latestLedgerRow
                      ? formatCurrency(projectedTotalSavings)
                      : "Not generated"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total shares
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {latestLedgerRow
                      ? formatCurrency(projectedShareCapital)
                      : "Not generated"}
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
                Finalization review
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Review member migration readiness before locking historical
                setup and opening live operations.
              </p>
            </div>
            <TrendPill tone="neutral">
              {appliedBackfillMembers}/{reviewRows.length} applied
            </TrendPill>
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div className="border-l border-border/70 pl-3">
              <p className="text-xs font-medium text-muted-foreground">
                Member profiles
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {reviewRows.length}
              </p>
            </div>
            <div className="border-l border-border/70 pl-3">
              <p className="text-xs font-medium text-muted-foreground">
                Applied member backfills
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {appliedBackfillMembers}/{reviewRows.length}
              </p>
            </div>
            <div className="border-l border-border/70 pl-3">
              <p className="text-xs font-medium text-muted-foreground">
                Missing histories
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
              <p>All visible migration review checks are clear.</p>
            )}
          </div>
          <form
            action={finalizeInitialMigrationAction}
            className="mt-4 grid gap-3 border-t border-border/70 pt-4 md:grid-cols-[minmax(0,1fr)_220px_auto]"
          >
            <div>
              <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Go live lock
              </p>
              <p className="mt-1 text-sm text-foreground">
                Finalization closes historical migration tools and opens live
                financial operations.
              </p>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Type FINALIZE MIGRATION
              <Input
                name="confirmation"
                placeholder="FINALIZE MIGRATION"
                required
                type="text"
              />
            </label>
            <div className="flex items-end justify-end">
              <Button disabled={!canFinalizeMigration} size="sm" type="submit">
                Finalize migration
              </Button>
            </div>
          </form>
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
              <p className="text-sm font-semibold text-foreground">
                Legacy loan setup
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Principal-only balances, scheduled repayment, and savings during
                loan feed the member ledger before backfill generation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TrendPill tone="warning">Before member backfill</TrendPill>
              <TrendPill tone="neutral">Savings during loan</TrendPill>
            </div>
          </div>
          {!legacyLoansReviewed && displayedLegacyLoanDrafts.length === 0 ? (
            <form
              action={markLegacyLoansReviewedAction}
              className="mb-5 grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950 md:grid-cols-[minmax(0,1fr)_180px_auto]"
            >
              <div>
                <p className="text-sm font-semibold">
                  No legacy loan balances?
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  Record an auditable review before member ledger backfill when
                  the cooperative has no historical loans to migrate.
                </p>
              </div>
              <label className="flex flex-col gap-1 text-xs font-medium text-amber-900">
                Type NO LEGACY LOANS
                <Input
                  name="confirmation"
                  placeholder="NO LEGACY LOANS"
                  required
                  type="text"
                />
              </label>
              <div className="flex items-end justify-end">
                <Button size="sm" type="submit" variant="outline">
                  Mark reviewed
                </Button>
              </div>
              <label className="flex flex-col gap-1 text-xs font-medium text-amber-900 md:col-span-3">
                Notes
                <Input
                  name="notes"
                  placeholder="Board minute, review source, or officer note"
                  type="text"
                />
              </label>
            </form>
          ) : null}
          {mutableMigrationMemberOptions.length === 0 ? (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Legacy loan drafts are locked</p>
              <p className="mt-1">
                Every available member has an applied historical ledger. Use
                correction workflows instead of adding migration loan drafts.
              </p>
            </div>
          ) : (
            <form
              action={createLegacyLoanMigrationDraftAction}
              className="mb-5 grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 md:grid-cols-2 xl:grid-cols-4"
            >
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Member
                <LabeledSelectInput
                  name="memberId"
                  options={mutableMigrationMemberOptions.map((member) => ({
                    label: member.label,
                    value: member.id,
                  }))}
                  placeholder="Select member"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Loan label
                <Input
                  name="loanLabel"
                  placeholder="Loan A"
                  required
                  type="text"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Loan date
                <DatePickerInput
                  name="openedAt"
                  placeholder="Select loan date"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Closed date
                <DatePickerInput
                  name="closedAt"
                  placeholder="Select closed date"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Principal
                <CurrencyPrefixInput
                  min="0"
                  name="principalAmount"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Monthly principal repayment
                <CurrencyPrefixInput
                  min="0"
                  name="scheduledMonthlyPrincipalRepayment"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Savings during loan
                <CurrencyPrefixInput
                  min="0"
                  name="savingsDuringLoan"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Outstanding principal
                <CurrencyPrefixInput
                  min="0"
                  name="outstandingPrincipalBalance"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground md:col-span-2 xl:col-span-3">
                Notes
                <Input
                  name="notes"
                  placeholder="Board approval, source file, or correction note"
                  type="text"
                />
              </label>
              <div className="flex items-end justify-end">
                <Button size="sm" type="submit">
                  Add loan draft
                </Button>
              </div>
            </form>
          )}
          <DashboardDataTable>
            <DashboardTable className="min-w-[920px]">
              <DashboardTableHead>
                <DashboardTableHeaderCell>Loan date</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Principal amount
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Monthly repayment
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Savings during loan
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Outstanding principal
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Action
                </DashboardTableHeaderCell>
              </DashboardTableHead>
              <DashboardTableBody>
                {displayedLegacyLoanDrafts.map((loan) => (
                  <DashboardTableRow key={loan.id}>
                    <DashboardTableCell>
                      <p className="text-sm font-medium text-foreground">
                        {loan.openedAt}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {loan.memberName} · {loan.memberNumber}
                      </p>
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      {formatCurrency(loan.principalAmount)}
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      {formatCurrency(loan.scheduledMonthlyPrincipalRepayment)}
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      {formatCurrency(loan.savingsDuringLoan)}
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      {formatCurrency(loan.outstandingPrincipalBalance)}
                    </DashboardTableCell>
                    <DashboardTableCell>
                      <TrendPill
                        tone={
                          loan.outstandingPrincipalBalance > 0
                            ? "warning"
                            : "positive"
                        }
                      >
                        {loan.status}
                      </TrendPill>
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      <LegacyLoanDraftEditDialog
                        disabled={
                          !hasRealMigrationContext ||
                          !mutableMigrationMemberIds.has(loan.memberId)
                        }
                        loan={loan}
                        memberOptions={memberOptions ?? []}
                      />
                    </DashboardTableCell>
                  </DashboardTableRow>
                ))}
              </DashboardTableBody>
            </DashboardTable>
          </DashboardDataTable>
        </DashboardSurfaceCard>
      ) : null}

      {isMigrationOverview ? ledgerBackfillSection : null}
    </section>
  )
}
