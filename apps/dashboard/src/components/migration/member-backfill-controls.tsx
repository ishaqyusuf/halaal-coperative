import type { MemberLedgerBackfillRow } from "@halaalvest/backfill"
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
import { formatCurrency } from "@halaalvest/utils"
import { MissedMonthsRangeGrid } from "@/components/migration/missed-months-range-grid"
import {
  setMigrationBackfillDefaultingMonthsAction,
  upsertMigrationBackfillAdjustmentAction,
} from "@/lib/dashboard-actions"

export function MemberBackfillAdjustmentDialog({
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

export function DefaultingMonthsDialog({
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
              {nextStatus === "missed" ? "Missed" : "Committed"}
            </Button>
          </form>
        )
      })}
    </div>
  )
}
