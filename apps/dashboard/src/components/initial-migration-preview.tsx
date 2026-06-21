import {
  groupRowsByEffectiveDateSegment,
  type MemberLedgerBackfillRow,
} from "@halaalvest/backfill"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@halaalvest/ui/components/dialog"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardDataTable,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TrendPill,
} from "@/components/dashboard"
import { MemberCreateForm } from "@/components/forms/member-forms"
import { MemberLedgerBackfillTable } from "@/components/migration/member-ledger-backfill-table"
import {
  createLegacyLoanMigrationDraftAction,
  finalizeInitialMigrationAction,
  queueBackfillApplyAction,
  queueBackfillDraftAction,
  markLegacyLoansReviewedAction,
  unlockInitialMigrationAction,
  updateLegacyLoanMigrationDraftAction,
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

type LegacyLoanDraftRow = {
  closedAt: string | null
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

type ProfitAdjustmentOption = {
  allocatableProfitAmount?: number
  availableAmount: number
  businessName: string
  editableAvailableAmount?: number
  expenseAmount?: number
  id: string
  label: string
  memberAllocatedAmount?: number
  profitAmount: number
  profitDate: string
  totalDisbursedAmount: number
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

const statusLabels: Record<InitialMigrationSnapshot["status"], string> = {
  finalized: "Finalized",
  historical_setup_in_progress: "Historical setup",
  live_operations: "Live operations",
  member_migration_in_progress: "Member migration",
  migration_review: "Migration review",
  not_started: "Not started",
}

const memberReviewStatusLabels: Record<
  MigrationMemberReviewRow["status"],
  string
> = {
  backfill_applied: "Applied",
  backfill_draft: "Drafted",
  configured: "Configured",
  profile_only: "Profile only",
}

function MemberProfitAllocationDialog({
  disabled,
  memberId,
  period,
  profitAdjustmentOptions,
  rowDividendCredit,
}: {
  disabled: boolean
  memberId: string | null | undefined
  period: string
  profitAdjustmentOptions?: ProfitAdjustmentOption[]
  rowDividendCredit: number
}) {
  const hasProfitPools = Boolean(profitAdjustmentOptions?.length)
  const totalProfitPool = (profitAdjustmentOptions ?? []).reduce(
    (total, entry) => total + entry.profitAmount,
    0
  )
  const totalRemainingProfit = (profitAdjustmentOptions ?? []).reduce(
    (total, entry) => total + entry.availableAmount,
    0
  )
  const totalMemberProfit = (profitAdjustmentOptions ?? []).reduce(
    (total, entry) => total + (entry.memberAllocatedAmount ?? 0),
    0
  )

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            className="rounded-full"
            disabled={disabled || !memberId || !hasProfitPools}
            size="sm"
            variant="outline"
          />
        }
      >
        Profit
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Dividend allocation
          </p>
          <DialogTitle>Set member profit for {period}</DialogTitle>
          <DialogDescription>
            Review the business profit pool before assigning this member's
            migration allocation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Current row credit</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatCurrency(rowDividendCredit)}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Profit pools</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {hasProfitPools ? formatCurrency(totalProfitPool) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {hasProfitPools ? formatCurrency(totalRemainingProfit) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">This member</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {hasProfitPools ? formatCurrency(totalMemberProfit) : "-"}
            </p>
          </div>
        </div>

        {profitAdjustmentOptions?.length ? (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <div className="grid min-w-[620px] grid-cols-[minmax(0,1fr)_repeat(4,100px)] gap-2 border-b border-border/70 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>Business profit</span>
              <span className="text-right">Disbursed</span>
              <span className="text-right">Remaining</span>
              <span className="text-right">This member</span>
              <span className="text-right">Editable max</span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {profitAdjustmentOptions.map((entry) => (
                <div
                  key={entry.id}
                  className="grid min-w-[620px] grid-cols-[minmax(0,1fr)_repeat(4,100px)] gap-2 border-b border-border/50 px-3 py-2 text-xs last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">
                      {entry.businessName}
                    </span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {entry.profitDate} · expenses{" "}
                      {formatCurrency(entry.expenseAmount ?? 0)}
                    </span>
                  </span>
                  <span className="text-right">
                    {formatCurrency(entry.totalDisbursedAmount)}
                  </span>
                  <span className="text-right">
                    {formatCurrency(entry.availableAmount)}
                  </span>
                  <span className="text-right">
                    {formatCurrency(entry.memberAllocatedAmount ?? 0)}
                  </span>
                  <span className="text-right">
                    {formatCurrency(
                      entry.editableAvailableAmount ?? entry.availableAmount
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Add a reviewed business profit pool before assigning member
            allocations.
          </div>
        )}

        <form
          action={upsertMigrationProfitAdjustmentAction}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input name="memberId" type="hidden" value={memberId ?? ""} />
          <label className="space-y-1 text-xs font-medium text-muted-foreground sm:col-span-2">
            Business profit
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              disabled={disabled || !hasProfitPools}
              name="profitEntryId"
              required
            >
              <option value="">Select profit pool</option>
              {(profitAdjustmentOptions ?? []).map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label} |{" "}
                  {formatCurrency(
                    entry.editableAvailableAmount ?? entry.availableAmount
                  )}{" "}
                  editable
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Member amount
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-right text-sm text-foreground"
              disabled={disabled}
              min="0"
              name="allocatedProfitAmount"
              placeholder="Amount"
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Member percentage
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-right text-sm text-foreground"
              disabled={disabled}
              max="100"
              min="0"
              name="sharePercentage"
              placeholder="%"
              step="0.0001"
              type="number"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground sm:col-span-2">
            Notes
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              disabled={disabled}
              name="notes"
              placeholder="Board minute, basis, or source file reference"
              type="text"
            />
          </label>
          <div className="flex justify-end sm:col-span-2">
            <Button
              disabled={disabled || !memberId || !hasProfitPools}
              size="sm"
              type="submit"
            >
              Save allocation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
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
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                Actual principal repayment
                <input
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-right text-sm text-foreground"
                  defaultValue={loan?.repaymentAmount ?? ""}
                  disabled={isDisabled}
                  min="0"
                  name="loanRepaymentAmount"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                <input
                  className="size-4"
                  defaultChecked={loan?.repaymentOnTime ?? false}
                  disabled={isDisabled}
                  name="loanRepaymentOnTime"
                  type="checkbox"
                />
                Mark repayment as on-time
              </label>
            </>
          ) : (
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Actual savings contribution
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-right text-sm text-foreground"
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
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Notes
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
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

function LegacyLoanDraftEditDialog({
  disabled,
  loan,
}: {
  disabled: boolean
  loan: LegacyLoanDraftRow & { status: string }
}) {
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
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Loan label
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              defaultValue={loan.loanLabel}
              name="loanLabel"
              required
              type="text"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Loan date
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              defaultValue={loan.openedAt}
              name="openedAt"
              required
              type="date"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Closed date
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              defaultValue={loan.closedAt ?? ""}
              name="closedAt"
              type="date"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Principal
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-right text-sm text-foreground"
              defaultValue={loan.principalAmount}
              min="0"
              name="principalAmount"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Monthly principal repayment
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-right text-sm text-foreground"
              defaultValue={loan.scheduledMonthlyPrincipalRepayment}
              min="0"
              name="scheduledMonthlyPrincipalRepayment"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Savings during loan
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-right text-sm text-foreground"
              defaultValue={loan.savingsDuringLoan}
              min="0"
              name="savingsDuringLoan"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Outstanding principal
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-right text-sm text-foreground"
              defaultValue={loan.outstandingPrincipalBalance}
              min="0"
              name="outstandingPrincipalBalance"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground sm:col-span-2">
            Notes
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
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

export function InitialMigrationPreview({
  generatedLedgerRows,
  legacyLoanDrafts,
  memberOptions,
  migrationSnapshot,
  migrationMemberReview,
  profitAdjustmentOptions,
  selectedMigrationMemberId,
  selectedMigrationMemberLabel,
  section = "all",
}: {
  generatedLedgerRows?: MemberLedgerBackfillRow[]
  legacyLoanDrafts?: LegacyLoanDraftRow[]
  memberOptions?: MemberOption[]
  migrationSnapshot?: InitialMigrationSnapshot
  migrationMemberReview?: MigrationMemberReviewRow[]
  profitAdjustmentOptions?: ProfitAdjustmentOption[]
  selectedMigrationMemberId?: string | null
  selectedMigrationMemberLabel?: string | null
  section?: "all" | "loans"
}) {
  const isLoansOnly = section === "loans"
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
  const legacyLoansReviewed =
    migrationSnapshot?.steps.find((step) => step.key === "legacy_loans")
      ?.complete ?? false
  const totalOutstandingLegacyPrincipal = activeLegacyLoanDrafts.reduce(
    (total, loan) => total + loan.outstandingPrincipalBalance,
    0
  )
  const latestLedgerRow = displayedLedgerRows[displayedLedgerRows.length - 1]
  const activeLoanRows = displayedLedgerRows.filter(
    (row) => row.loanColumns.length > 0
  )
  const projectedShareCapital = latestLedgerRow?.runningShareCapitalBalance ?? 0
  const projectedDividendCredit = displayedLedgerRows.reduce(
    (total, row) => total + row.dividendCredit,
    0
  )
  const firstLedgerRow = displayedLedgerRows[0]
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
  const totalAllocatableBusinessProfit = (profitAdjustmentOptions ?? []).reduce(
    (total, profitEntry) =>
      total + (profitEntry.allocatableProfitAmount ?? profitEntry.profitAmount),
    0
  )
  const totalBusinessProfitPool = (profitAdjustmentOptions ?? []).reduce(
    (total, profitEntry) => total + profitEntry.profitAmount,
    0
  )
  const totalDisbursedBusinessProfit = (profitAdjustmentOptions ?? []).reduce(
    (total, profitEntry) => total + profitEntry.totalDisbursedAmount,
    0
  )
  const availableBusinessProfit =
    totalAllocatableBusinessProfit - totalDisbursedBusinessProfit
  const outstandingPrincipal = displayedLedgerRows.reduce((latest, row) => {
    const loan = row.loanColumns[0]
    return loan ? loan.outstandingPrincipalBalance : latest
  }, 0)
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
      .filter((step) => blockingFinalizationSteps.includes(step.key))
      .map((step) => step.label) ?? []
  const memberBackfillBlockingStepKeys =
    migrationSnapshot?.missingStepKeys.filter(
      (stepKey) =>
        stepKey === "finance_start_date" ||
        stepKey === "charge_schedules" ||
        stepKey === "business_profit_pools" ||
        stepKey === "share_capital_plan" ||
        stepKey === "legacy_loans" ||
        stepKey === "member_profiles"
    ) ?? []
  const memberBackfillBlockingLabels =
    migrationSnapshot?.steps
      .filter((step) => memberBackfillBlockingStepKeys.includes(step.key))
      .map((step) => step.label) ?? []
  const memberProfileBlockingStepKeys =
    migrationSnapshot?.missingStepKeys.filter(
      (stepKey) =>
        stepKey === "finance_start_date" ||
        stepKey === "charge_schedules" ||
        stepKey === "business_profit_pools" ||
        stepKey === "share_capital_plan"
    ) ?? []
  const memberProfileBlockingLabels =
    migrationSnapshot?.steps
      .filter((step) => memberProfileBlockingStepKeys.includes(step.key))
      .map((step) => step.label) ?? []
  const canStartMemberBackfill = memberBackfillBlockingStepKeys.length === 0
  const unappliedMemberBackfills = reviewRows.filter(
    (member) => member.status !== "backfill_applied"
  ).length
  const canCreateMigrationMemberProfile =
    Boolean(migrationSnapshot?.canUseMigrationTools) &&
    !migrationSnapshot?.canUseLiveFinancialWrites &&
    memberProfileBlockingStepKeys.length === 0 &&
    appliedBackfillMembers === 0
  const canFinalizeMigration =
    Boolean(migrationSnapshot?.canUseMigrationTools) &&
    !migrationSnapshot?.canUseLiveFinancialWrites &&
    blockingFinalizationSteps.length === 0
  const canRequestEmergencyUnlock = migrationSnapshot
    ? !migrationSnapshot.canUseMigrationTools
    : false
  const canQueueSelectedMemberBackfill =
    Boolean(selectedMigrationMemberId) &&
    Boolean(generatedLedgerRows?.length) &&
    Boolean(migrationSnapshot?.canUseMigrationTools) &&
    canStartMemberBackfill &&
    !selectedMemberBackfillApplied
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

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Initial migration"
        title={
          isLoansOnly ? "Legacy loan setup" : "Member ledger backfill preview"
        }
        description={
          isLoansOnly
            ? "Configure principal-only opening loan positions, monthly repayment, and savings during loan before member ledger backfill."
            : "Generate and review the member ledger history that will become authoritative when the one-time migration is applied."
        }
        actions={
          <>
            <TrendPill
              tone={generatedLedgerRows?.length ? "positive" : "warning"}
            >
              {generatedLedgerRows?.length
                ? "Generated preview"
                : "Select member"}
            </TrendPill>
            <TrendPill tone="neutral">Principal-only loan balance</TrendPill>
          </>
        }
      />

      {!isLoansOnly ? (
        <DashboardSurfaceCard
          as="section"
          className="mt-5 scroll-mt-24 bg-background/70"
          id="member-profiles"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Migration member profiles
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create the member profile first, then configure legacy loans and
                generate that member's historical ledger.
              </p>
            </div>
            <TrendPill
              tone={canCreateMigrationMemberProfile ? "positive" : "warning"}
            >
              {canCreateMigrationMemberProfile
                ? "Profiles open"
                : "Profiles locked"}
            </TrendPill>
          </div>

          {canCreateMigrationMemberProfile ? (
            <MemberCreateForm
              devMode={process.env.NODE_ENV !== "production"}
              inModal
            />
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">
                Member profile creation is not open.
              </p>
              <p className="mt-1">
                {memberProfileBlockingLabels.length > 0
                  ? `Finish setup first: ${memberProfileBlockingLabels.join(", ")}.`
                  : appliedBackfillMembers > 0
                    ? "Member backfill has already started, so migration profiles are locked."
                    : migrationSnapshot?.canUseLiveFinancialWrites
                      ? "Live operations are open. Create new members from the members area."
                      : "Migration tools must be open before creating migration member profiles."}
              </p>
            </div>
          )}
        </DashboardSurfaceCard>
      ) : null}

      {!isLoansOnly ? (
        <DashboardSurfaceCard
          as="section"
          className="mt-5 scroll-mt-24 bg-background/70"
          id="member-backfill-preview"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Generated member preview
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedMigrationMemberLabel
                  ? `Showing generated ledger rows for ${selectedMigrationMemberLabel}.`
                  : "Select a member to generate ledger rows from migration setup data."}
              </p>
            </div>
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              method="get"
            >
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                Member
                <select
                  className="h-9 min-w-[260px] rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  defaultValue={selectedMigrationMemberId ?? ""}
                  name="migrationMemberId"
                >
                  <option value="">Select a member</option>
                  {(memberOptions ?? []).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                disabled={!memberOptions || memberOptions.length === 0}
                size="sm"
                type="submit"
                variant="outline"
              >
                Preview member
              </Button>
            </form>
          </div>
          {selectedMemberHeadline ? (
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 p-3">
              <div className="mb-3">
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  Member history headline
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Snapshot used to review the generated month-to-date ledger.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
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
                      : "Generate preview"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(360px,1fr)]">
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                selectedMemberBackfillApplied
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : generatedLedgerRows?.length
                    ? "border-blue-200 bg-blue-50 text-blue-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <p className="font-medium">
                {selectedMemberBackfillApplied
                  ? "Historical ledger already applied."
                  : memberBackfillBlockingLabels.length > 0
                    ? `Missing setup: ${memberBackfillBlockingLabels.join(", ")}.`
                    : generatedLedgerRows?.length
                      ? "Generated ledger is ready for review."
                      : "Live member data is required before posting history."}
              </p>
              <p className="mt-1">
                Applying creates immutable opening ledger months for the
                selected member. After go-live, use live corrections instead.
              </p>
            </div>
            <form
              action={queueBackfillDraftAction}
              className="grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 sm:grid-cols-[1fr_auto]"
            >
              <input
                name="memberId"
                type="hidden"
                value={selectedMigrationMemberId ?? ""}
              />
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  Member backfill posting
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Save the generated ledger as a draft, then apply it after
                  review.
                </p>
              </div>
              <div className="flex flex-wrap items-end justify-end gap-2">
                <Button
                  disabled={
                    !selectedMigrationMemberId ||
                    !generatedLedgerRows?.length ||
                    !migrationSnapshot?.canUseMigrationTools ||
                    !canStartMemberBackfill ||
                    selectedMemberBackfillApplied
                  }
                  size="sm"
                  type="submit"
                  variant="outline"
                >
                  Save draft
                </Button>
              </div>
            </form>
            <form
              action={queueBackfillApplyAction}
              className="grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 lg:col-start-2"
            >
              <input
                name="memberId"
                type="hidden"
                value={selectedMigrationMemberId ?? ""}
              />
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                Type APPLY BACKFILL
                <input
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  name="confirmation"
                  placeholder="APPLY BACKFILL"
                  required
                  type="text"
                />
              </label>
              <Button
                disabled={!canQueueSelectedMemberBackfill}
                size="sm"
                type="submit"
              >
                Apply historical ledger
              </Button>
            </form>
          </div>
        </DashboardSurfaceCard>
      ) : null}

      {!isLoansOnly ? (
        <section className="mt-5 grid gap-4 md:grid-cols-4">
          <DashboardStatCard
            label="Preview member"
            value={selectedMigrationMemberLabel ?? "No member"}
            detail={
              generatedLedgerRows?.length
                ? "Generated from tenant setup."
                : hasRealMigrationContext
                  ? "Select a member to generate rows."
                  : "Sample rows show the expected ledger structure."
            }
          />
          <DashboardStatCard
            label="Segments"
            value={segments.length.toString()}
            detail="Split by charge, loan, and savings changes."
          />
          <DashboardStatCard
            label="Active loan rows"
            value={activeLoanRows.length.toString()}
            detail="Loan columns disappear after settlement."
            tone="warning"
          />
          <DashboardStatCard
            label="Loan principal balance"
            value={formatCurrency(outstandingPrincipal)}
            detail="Fees, profit, and charges stay separate."
            tone="positive"
          />
        </section>
      ) : null}

      {!isLoansOnly && migrationSnapshot ? (
        <DashboardSurfaceCard className="mt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Tenant readiness
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Migration tools stay available until finalization. Live
                financial writes should only open after live operations.
              </p>
            </div>
            <TrendPill
              tone={
                migrationSnapshot.canUseMigrationTools ? "warning" : "positive"
              }
            >
              {migrationSnapshot.canUseMigrationTools
                ? "Migration tools open"
                : "Migration tools locked"}
            </TrendPill>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {migrationSnapshot.steps.map((step) => (
              <div
                key={step.key}
                className="rounded-xl border border-border/70 bg-background px-3 py-2"
              >
                <p className="text-xs font-medium text-foreground">
                  {step.label}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {step.complete ? "Complete" : "Missing"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
            <form
              action={finalizeInitialMigrationAction}
              className="rounded-lg border border-border/70 bg-muted/30 p-3"
            >
              <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Go live lock
              </p>
              <p className="mt-2 text-sm text-foreground">
                Finalization closes historical migration tools and opens live
                financial operations.
              </p>
              <div
                className={`mt-3 rounded-md border px-3 py-2 text-xs ${
                  canFinalizeMigration
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {canFinalizeMigration ? (
                  <p>
                    Ready to go live. Historical migration will be locked after
                    finalization.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium">Finalization is blocked.</p>
                    {blockingFinalizationLabels.length > 0 ? (
                      <p>Missing: {blockingFinalizationLabels.join(", ")}.</p>
                    ) : null}
                    {unappliedMemberBackfills > 0 ? (
                      <p>
                        {unappliedMemberBackfills} member backfill record(s)
                        still need to be applied.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
              <label className="mt-3 block space-y-1 text-xs font-medium text-muted-foreground">
                Type FINALIZE MIGRATION
                <input
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  name="confirmation"
                  placeholder="FINALIZE MIGRATION"
                  required
                  type="text"
                />
              </label>
              <Button
                className="mt-3"
                disabled={!canFinalizeMigration}
                size="sm"
                type="submit"
              >
                Finalize migration
              </Button>
            </form>
            <form
              action={unlockInitialMigrationAction}
              className="rounded-lg border border-border/70 bg-muted/30 p-3"
            >
              <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Emergency unlock
              </p>
              <p className="mt-2 text-sm text-foreground">
                Temporarily reopen migration tools only for post-finalization
                remediation.
              </p>
              <div className="mt-3 grid gap-2">
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  disabled={!canRequestEmergencyUnlock}
                  name="unlockUntil"
                  type="datetime-local"
                />
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  disabled={!canRequestEmergencyUnlock}
                  name="reason"
                  placeholder="Board approval reason"
                  type="text"
                />
              </div>
              <Button
                className="mt-3"
                disabled={!canRequestEmergencyUnlock}
                size="sm"
                type="submit"
                variant="outline"
              >
                Unlock migration tools
              </Button>
            </form>
          </div>
        </DashboardSurfaceCard>
      ) : null}

      {!isLoansOnly ? (
        <DashboardSurfaceCard
          as="section"
          className="mt-5 scroll-mt-24 bg-background/70"
          id="finalization-review"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <section className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Member profiles
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {reviewRows.length}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Applied member backfills
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {appliedBackfillMembers}/{reviewRows.length}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Missing histories
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {membersMissingAppliedBackfill}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Active legacy loans
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {activeLegacyLoanDrafts.length}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Outstanding principal
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatCurrency(totalOutstandingLegacyPrincipal)}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Selected preview savings
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatCurrency(latestLedgerRow?.runningSavingsBalance ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Selected preview share
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatCurrency(projectedShareCapital)}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Selected preview dividend
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatCurrency(projectedDividendCredit)}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Business profit pool
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatCurrency(totalBusinessProfitPool)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatCurrency(totalAllocatableBusinessProfit)} allocatable
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Profit pool available
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatCurrency(availableBusinessProfit)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatCurrency(totalDisbursedBusinessProfit)} allocated
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Review warnings
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {finalizationWarnings.length}
              </p>
            </div>
          </section>
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
              finalizationWarnings.length > 0
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
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
          <DashboardDataTable>
            <DashboardTable className="min-w-[980px]">
              <DashboardTableHead>
                <DashboardTableHeaderCell>Member</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Joined</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Loans
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Row edits
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Profit edits
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Backfill
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Status
                </DashboardTableHeaderCell>
              </DashboardTableHead>
              <DashboardTableBody>
                {reviewRows.map((member) => (
                  <DashboardTableRow key={member.id}>
                    <DashboardTableCell>
                      <p className="font-medium text-foreground">
                        {member.fullName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {member.memberNumber}
                      </p>
                    </DashboardTableCell>
                    <DashboardTableCell>{member.joinedAt}</DashboardTableCell>
                    <DashboardTableCell align="right">
                      {member.legacyLoanDrafts}
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      {member.rowAdjustments}
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      {member.profitAdjustments}
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      {member.appliedBackfillBatches} applied /{" "}
                      {member.backfillDraftBatches} draft
                      {member.appliedBackfillMonths > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {member.appliedBackfillMonths} month(s)
                        </p>
                      ) : null}
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      <TrendPill
                        tone={
                          member.status === "backfill_applied"
                            ? "positive"
                            : member.status === "profile_only"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {memberReviewStatusLabels[member.status]}
                      </TrendPill>
                    </DashboardTableCell>
                  </DashboardTableRow>
                ))}
              </DashboardTableBody>
            </DashboardTable>
          </DashboardDataTable>
        </DashboardSurfaceCard>
      ) : null}

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
              <p className="text-sm font-semibold">No legacy loan balances?</p>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                Record an auditable review before member ledger backfill when
                the cooperative has no historical loans to migrate.
              </p>
            </div>
            <label className="space-y-1 text-xs font-medium text-amber-900">
              Type NO LEGACY LOANS
              <input
                className="h-9 w-full rounded-md border border-amber-200 bg-background px-3 text-sm text-foreground"
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
            <label className="space-y-1 text-xs font-medium text-amber-900 md:col-span-3">
              Notes
              <input
                className="h-9 w-full rounded-md border border-amber-200 bg-background px-3 text-sm text-foreground"
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
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Member
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                name="memberId"
                required
              >
                <option value="">Select member</option>
                {mutableMigrationMemberOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Loan label
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                name="loanLabel"
                placeholder="Loan A"
                required
                type="text"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Loan date
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                name="openedAt"
                required
                type="date"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Closed date
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                name="closedAt"
                type="date"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Principal
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                min="0"
                name="principalAmount"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Monthly principal repayment
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                min="0"
                name="scheduledMonthlyPrincipalRepayment"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Savings during loan
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                min="0"
                name="savingsDuringLoan"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Outstanding principal
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                min="0"
                name="outstandingPrincipalBalance"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground md:col-span-2 xl:col-span-3">
              Notes
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
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
                    />
                  </DashboardTableCell>
                </DashboardTableRow>
              ))}
            </DashboardTableBody>
          </DashboardTable>
        </DashboardDataTable>
      </DashboardSurfaceCard>

      {!isLoansOnly ? (
        <div className="mt-5">
          <MemberLedgerBackfillTable
            isRowAdjustmentDisabled={(row) =>
              !selectedMigrationMemberId ||
              !row.month ||
              selectedMemberBackfillApplied
            }
            renderProfitControl={(row) => (
              <MemberProfitAllocationDialog
                disabled={selectedMemberBackfillApplied}
                memberId={selectedMigrationMemberId}
                period={row.period}
                profitAdjustmentOptions={profitAdjustmentOptions}
                rowDividendCredit={row.dividendCredit}
              />
            )}
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
            segments={segments}
          />
        </div>
      ) : null}
    </DashboardSectionCard>
  )
}
