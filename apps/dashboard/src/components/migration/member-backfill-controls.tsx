"use client"

import { DashboardNativeQuickFill } from "@/components/dashboard-quick-fill"
import type { MemberLedgerBackfillRow } from "@halaalvest/backfill"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { formatCurrency } from "@halaalvest/utils"
import { MemberBackfillActionForm } from "@/components/migration/migration-action-forms"
import { MissedMonthsRangeGrid } from "@/components/migration/missed-months-range-grid"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { WorkflowPresentationHeader } from "@/components/workflow-presentation-header"
import { useMemberBackfillParams } from "@/hooks/use-member-backfill-params"
import {
  setMigrationBackfillDefaultingMonthsAction,
  upsertMigrationBackfillAdjustmentAction,
} from "@/lib/dashboard-actions"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

const touchTargetClassName =
  "grid gap-4 max-md:[&_a]:min-h-11 max-md:[&_button]:min-h-11 max-md:[&_input]:min-h-11 max-md:[_[role=combobox]]:min-h-11"

// Ledger cells only set URL params; MemberBackfillCellEditors renders the one
// registered dialog, since the table repeats each cell in its action menu.
export function MemberBackfillAdjustmentButton({
  disabled,
  loan,
  memberId,
  mode,
  month,
  savingsContribution,
}: {
  disabled: boolean
  loan?: MemberLedgerBackfillRow["loanColumns"][number]
  memberId: string | null | undefined
  mode: "repayment" | "savings"
  month?: string
  savingsContribution: number
}) {
  const { setParams } = useMemberBackfillParams()
  const isRepayment = mode === "repayment"
  const triggerLabel = isRepayment
    ? loan
      ? formatCurrency(loan.repaymentAmount)
      : "-"
    : formatCurrency(savingsContribution)
  const isDisabled = disabled || !memberId || !month || (isRepayment && !loan)

  return (
    <Button
      className="h-auto rounded-md px-2 py-1 text-right font-medium text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
      disabled={isDisabled}
      onClick={() =>
        void setParams({
          memberBackfillMonth: month ?? null,
          memberBackfillSheetType: "adjustment",
          memberBackfillTargetId: isRepayment ? (loan?.id ?? null) : null,
        })
      }
      size="sm"
      type="button"
      variant="ghost"
    >
      {triggerLabel}
    </Button>
  )
}

export function DefaultingMonthsButton({
  disabled,
  memberId,
  selectedMonth,
  triggerVariant = "ghost",
  triggerLabel = "Missed months",
}: {
  disabled: boolean
  memberId: string | null | undefined
  selectedMonth?: string
  triggerLabel?: string
  triggerVariant?: "default" | "ghost"
}) {
  const { setParams } = useMemberBackfillParams()

  return (
    <Button
      disabled={disabled || !memberId}
      onClick={() =>
        void setParams({
          memberBackfillMonth: selectedMonth ?? null,
          memberBackfillSheetType: "missedMonths",
          memberBackfillTargetId: null,
        })
      }
      size="xs"
      type="button"
      variant={triggerVariant}
    >
      {triggerLabel}
    </Button>
  )
}

function AdjustmentEditor({
  disabled,
  loan,
  memberId,
  row,
}: {
  disabled: boolean
  loan?: MemberLedgerBackfillRow["loanColumns"][number]
  memberId: string
  row: MemberLedgerBackfillRow
}) {
  const isRepayment = Boolean(loan)
  const activeLoans = loan ? [loan] : row.loanColumns
  const activeLoanBalance = activeLoans.reduce(
    (sum, item) => sum + item.outstandingPrincipalBalance,
    0
  )

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">Current savings</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(row.savingsContribution)}
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
            <p className="mt-1 text-xs text-muted-foreground">
              {activeLoans.length} active loans in this period
            </p>
          ) : null}
        </div>
      </div>

      <MemberBackfillActionForm
        action={upsertMigrationBackfillAdjustmentAction}
        className="grid gap-3"
      >
        <input name="memberId" type="hidden" value={memberId} />
        <input name="month" type="hidden" value={row.month ?? ""} />
        <DashboardNativeQuickFill
          enabled={!disabled}
          values={() => ({
            loanRepaymentAmount: String(loan?.repaymentAmount || 25_000),
            loanRepaymentOnTime: true,
            notes: "Matched to the ledger book and bank statement.",
            savingsContribution: String(row.savingsContribution || 10_000),
          })}
        />
        {isRepayment ? (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Actual principal repayment
              <CurrencyPrefixInput
                defaultValue={loan?.repaymentAmount ?? ""}
                disabled={disabled}
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
                disabled={disabled}
                name="loanRepaymentOnTime"
              />
              Paid on time
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Saved this month
            <CurrencyPrefixInput
              defaultValue={row.savingsContribution}
              disabled={disabled}
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
            disabled={disabled}
            name="notes"
            placeholder="Receipt, board note, or source file reference"
            type="text"
          />
        </label>
        <div className="flex justify-end">
          <Button disabled={disabled} size="sm" type="submit">
            Save
          </Button>
        </div>
      </MemberBackfillActionForm>
    </>
  )
}

// Hosts the ledger cell editors (ADR items R1 and R2) once per page, opened by
// `memberBackfillSheetType=adjustment|missedMonths` plus the month and loan.
export function MemberBackfillCellEditors({
  disabled,
  memberId,
  rows,
}: {
  disabled: boolean
  memberId: string | null | undefined
  rows: MemberLedgerBackfillRow[]
}) {
  const {
    memberBackfillMonth,
    memberBackfillSheetType,
    memberBackfillTargetId,
    setParams,
  } = useMemberBackfillParams()
  const adjustmentConfig = getWorkflowPresentation(
    "memberBackfill",
    "adjustment"
  )
  const missedMonthsConfig = getWorkflowPresentation(
    "memberBackfill",
    "missedMonths"
  )
  const usableRows = rows.filter((row) => row.month)
  const adjustmentRow =
    memberBackfillSheetType === "adjustment"
      ? usableRows.find((row) => row.month === memberBackfillMonth)
      : undefined
  const adjustmentLoan = memberBackfillTargetId
    ? adjustmentRow?.loanColumns.find(
        (loan) => loan.id === memberBackfillTargetId
      )
    : undefined
  const isAdjustmentOpen = Boolean(
    memberId && adjustmentRow && (!memberBackfillTargetId || adjustmentLoan)
  )
  const isMissedMonthsOpen = Boolean(
    memberId && memberBackfillSheetType === "missedMonths"
  )

  function close(open: boolean) {
    if (open) {
      return
    }

    void setParams({
      memberBackfillMonth: null,
      memberBackfillSheetType: null,
      memberBackfillTargetId: null,
    })
  }

  return (
    <>
      <WorkflowPresentation
        config={adjustmentConfig}
        contentClassName={touchTargetClassName}
        open={isAdjustmentOpen}
        onOpenChange={close}
      >
        {memberId && adjustmentRow ? (
          <>
            <WorkflowPresentationHeader
              description="Change this month only. The months after it are worked out again; the rest of their history stays."
              eyebrow="This month only"
              presentation={adjustmentConfig.presentation}
              title={`${adjustmentLoan ? "Edit loan repayment" : "Edit savings"} for ${adjustmentRow.period}`}
            />
            <AdjustmentEditor
              disabled={disabled}
              loan={adjustmentLoan}
              memberId={memberId}
              row={adjustmentRow}
            />
          </>
        ) : null}
      </WorkflowPresentation>
      <WorkflowPresentation
        config={missedMonthsConfig}
        contentClassName={touchTargetClassName}
        open={isMissedMonthsOpen}
        onOpenChange={close}
      >
        {memberId && isMissedMonthsOpen ? (
          <>
            <WorkflowPresentationHeader
              description="Tick the months this member paid nothing. Those months add no savings, shares or charges."
              presentation={missedMonthsConfig.presentation}
              title="Missed months"
            />
            <MemberBackfillActionForm
              action={setMigrationBackfillDefaultingMonthsAction}
              className="space-y-4"
            >
              <input name="memberId" type="hidden" value={memberId} />
              <MissedMonthsRangeGrid
                disabled={disabled}
                rows={usableRows.map((row) => ({
                  month: row.month ?? "",
                  period: row.period,
                  savingsContribution: row.savingsContribution,
                  status: row.status,
                }))}
                selectedMonth={memberBackfillMonth ?? undefined}
              />
              <div className="flex justify-end">
                <Button disabled={disabled} size="sm" type="submit">
                  Save missed months
                </Button>
              </div>
            </MemberBackfillActionForm>
          </>
        ) : null}
      </WorkflowPresentation>
    </>
  )
}

export function MonthStatusControl({
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
              {nextStatus === "missed" ? "Missed" : "Paid"}
            </Button>
          </form>
        )
      })}
    </div>
  )
}
