"use client"

import { type FormEvent, useMemo, useState, useTransition } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardDataTable,
  DashboardStatCard,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TrendPill,
} from "@/components/dashboard"
import { DatePickerInput } from "@/components/date-picker-input"
import { PublishShareProfitAllocationsButton } from "@/components/forms/tenant-finance-forms"
import { saveBusinessProfitMigrationWorksheetAction } from "@/lib/dashboard-actions"

type AllocationMode = "percentage" | "value"

type ExpenseLine = {
  amount: string
  id: string
  reason: string
}

type AllocationRow = {
  allocatedProfitAmount: number
  joinedAt: string
  memberId: string
  memberName: string
  memberNumber: string
  shareBalance: number
  sharePercentage: number
  status: string
}

export type BusinessProfitMigrationWorksheetData = {
  allocatedTotal: number
  allocations: AllocationRow[]
  eligibleMemberCount: number
  expenseLines: Array<{
    amount: number
    id: string
    reason: string
  }>
  expenseTotal: number
  profitEntry: {
    hasPublishedAllocations: boolean
    id: string
    linkedDividendPeriod?: {
      id: string
      name: string
      status: string
    } | null
    profitAmount: number
    profitDate: string
    status: string
  }
  remainingAmount: number
  shareableDividend: number
  shareBusiness: {
    id: string
    name: string
    startDate: string
  }
  totalShareBalance: number
}

function parseAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function createExpenseLineId() {
  return `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

export function BusinessProfitMigrationWorksheet({
  isLocked,
  worksheet,
}: {
  isLocked: boolean
  worksheet: BusinessProfitMigrationWorksheetData
}) {
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [allocationMode, setAllocationMode] =
    useState<AllocationMode>("value")
  const [profitAmount, setProfitAmount] = useState(
    worksheet.profitEntry.profitAmount.toString()
  )
  const [profitDate, setProfitDate] = useState(worksheet.profitEntry.profitDate)
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>(
    worksheet.expenseLines.length > 0
      ? worksheet.expenseLines.map((line) => ({
          amount: line.amount.toString(),
          id: line.id,
          reason: line.reason,
        }))
      : [{ amount: "", id: "expense-0", reason: "" }]
  )
  const [allocationValues, setAllocationValues] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      worksheet.allocations.map((allocation) => [
        allocation.memberId,
        allocation.allocatedProfitAmount
          ? allocation.allocatedProfitAmount.toString()
          : "",
      ])
    )
  )
  const [allocationPercentages, setAllocationPercentages] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      worksheet.allocations.map((allocation) => [
        allocation.memberId,
        allocation.sharePercentage ? allocation.sharePercentage.toString() : "",
      ])
    )
  )

  const totals = useMemo(() => {
    const expenseTotal = roundCurrency(
      expenseLines.reduce((total, line) => total + parseAmount(line.amount), 0)
    )
    const shareableDividend = roundCurrency(
      parseAmount(profitAmount) - expenseTotal
    )
    const allocatedTotal = roundCurrency(
      worksheet.allocations.reduce((total, allocation) => {
        if (allocationMode === "percentage") {
          return (
            total +
            shareableDividend *
              (parseAmount(allocationPercentages[allocation.memberId]) / 100)
          )
        }

        return total + parseAmount(allocationValues[allocation.memberId])
      }, 0)
    )

    return {
      allocatedTotal,
      expenseTotal,
      remainingAmount: roundCurrency(shareableDividend - allocatedTotal),
      shareableDividend,
    }
  }, [
    allocationMode,
    allocationPercentages,
    allocationValues,
    expenseLines,
    profitAmount,
    worksheet.allocations,
  ])

  const allocationIsBalanced = Math.abs(totals.remainingAmount) <= 0.01
  const cannotSave =
    isLocked ||
    isPending ||
    worksheet.allocations.length === 0 ||
    totals.shareableDividend < 0 ||
    !allocationIsBalanced
  const canPublish =
    !cannotSave &&
    !worksheet.profitEntry.hasPublishedAllocations &&
    Boolean(worksheet.profitEntry.linkedDividendPeriod)

  function updateExpenseLine(
    index: number,
    field: "amount" | "reason",
    value: string
  ) {
    setExpenseLines((lines) =>
      lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      )
    )
  }

  function addExpenseLine() {
    setExpenseLines((lines) => [
      ...lines,
      { amount: "", id: createExpenseLineId(), reason: "" },
    ])
  }

  function removeExpenseLine(index: number) {
    setExpenseLines((lines) =>
      lines.length === 1
        ? [{ amount: "", id: "expense-0", reason: "" }]
        : lines.filter((_, lineIndex) => lineIndex !== index)
    )
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      try {
        await saveBusinessProfitMigrationWorksheetAction(formData)
        showSuccess(
          "Profit worksheet saved",
          "Draft allocations and expense lines were updated."
        )
      } catch (error) {
        showError(
          "Could not save worksheet",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Business profit migration
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {worksheet.shareBusiness.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Share basis uses members joined on or before{" "}
            {formatDate(worksheet.shareBusiness.startDate)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Load shareable members
          </Button>
          <PublishShareProfitAllocationsButton
            disabled={!canPublish}
            profitEntryId={worksheet.profitEntry.id}
          />
        </div>
      </div>

      {isLocked ? (
        <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Historical finance setup is locked. This worksheet is read-only.
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-6">
        <DashboardStatCard
          label="Total shares"
          value={formatCurrency(worksheet.totalShareBalance)}
          detail="At business start date"
        />
        <DashboardStatCard
          label="Eligible members"
          value={worksheet.eligibleMemberCount.toString()}
          detail="Joined before basis date"
        />
        <DashboardStatCard
          label="Total profit"
          value={formatCurrency(parseAmount(profitAmount))}
          detail={formatDate(profitDate)}
        />
        <DashboardStatCard
          label="Expenses"
          value={formatCurrency(totals.expenseTotal)}
          detail="Itemized charges"
        />
        <DashboardStatCard
          label="Shareable dividend"
          value={formatCurrency(totals.shareableDividend)}
          detail="Profit less expenses"
        />
        <DashboardStatCard
          label="Remaining"
          value={formatCurrency(totals.remainingAmount)}
          detail={allocationIsBalanced ? "Balanced" : "Needs allocation"}
          tone={allocationIsBalanced ? "positive" : "warning"}
        />
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <input
          name="allocationMode"
          type="hidden"
          value={allocationMode}
        />
        <input
          name="profitEntryId"
          type="hidden"
          value={worksheet.profitEntry.id}
        />

        <section className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Business
              <Input disabled value={worksheet.shareBusiness.name} />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Profit date
              <DatePickerInput
                disabled={isLocked}
                name="profitDate"
                onChange={setProfitDate}
                placeholder="Select profit date"
                required
                value={profitDate}
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Total profit
              <CurrencyPrefixInput
                disabled={isLocked}
                min="0"
                name="profitAmount"
                onChange={(event) => setProfitAmount(event.target.value)}
                required
                step="0.01"
                type="number"
                value={profitAmount}
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Allocation mode
              <NativeSelect
                disabled={isLocked}
                onChange={(event) =>
                  setAllocationMode(event.target.value as AllocationMode)
                }
                value={allocationMode}
              >
                <option value="value">Value</option>
                <option value="percentage">Percentage</option>
              </NativeSelect>
            </label>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Expense lines
              </h2>
              <p className="text-xs text-muted-foreground">
                These reduce total profit before member dividends are allocated.
              </p>
            </div>
            <Button
              disabled={isLocked}
              onClick={addExpenseLine}
              type="button"
              variant="outline"
            >
              Add line
            </Button>
          </div>

          <DashboardDataTable className="rounded-none">
            <DashboardTable>
              <DashboardTableHead>
                <DashboardTableHeaderCell>Charge reason</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Amount
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Action
                </DashboardTableHeaderCell>
              </DashboardTableHead>
              <DashboardTableBody>
                {expenseLines.map((line, index) => (
                  <DashboardTableRow key={line.id}>
                    <DashboardTableCell>
                      <Input
                        disabled={isLocked}
                        name={`expenseReason-${index}`}
                        onChange={(event) =>
                          updateExpenseLine(index, "reason", event.target.value)
                        }
                        placeholder="Charge reason"
                        value={line.reason}
                      />
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      <CurrencyPrefixInput
                        disabled={isLocked}
                        min="0"
                        name={`expenseAmount-${index}`}
                        onChange={(event) =>
                          updateExpenseLine(index, "amount", event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={line.amount}
                      />
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      <Button
                        disabled={isLocked}
                        onClick={() => removeExpenseLine(index)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Remove
                      </Button>
                    </DashboardTableCell>
                  </DashboardTableRow>
                ))}
              </DashboardTableBody>
            </DashboardTable>
          </DashboardDataTable>
        </section>

        <section className="space-y-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Member allocation worksheet
              </h2>
              <p className="text-xs text-muted-foreground">
                Share value is fixed at business start date for this profit
                pool.
              </p>
            </div>
            <TrendPill tone={allocationIsBalanced ? "positive" : "warning"}>
              Allocated {formatCurrency(totals.allocatedTotal)}
            </TrendPill>
          </div>

          <DashboardDataTable className="rounded-none">
            <DashboardTable className="table-fixed text-xs">
              <colgroup>
                <col className="w-52" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-32" />
                <col className="w-36" />
              </colgroup>
              <DashboardTableHead>
                <DashboardTableHeaderCell>Member</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Joined</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Share at date
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Business %
                </DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">
                  Dividend
                </DashboardTableHeaderCell>
              </DashboardTableHead>
              <DashboardTableBody>
                {worksheet.allocations.map((allocation) => {
                  const percentageValue =
                    allocationPercentages[allocation.memberId] ?? ""
                  const dividendValue =
                    allocationValues[allocation.memberId] ?? ""
                  const computedDividend = roundCurrency(
                    totals.shareableDividend *
                      (parseAmount(percentageValue) / 100)
                  )
                  const computedPercentage =
                    totals.shareableDividend > 0
                      ? (parseAmount(dividendValue) /
                          totals.shareableDividend) *
                        100
                      : 0

                  return (
                    <DashboardTableRow key={allocation.memberId}>
                      <DashboardTableCell>
                        <p className="font-medium text-foreground">
                          {allocation.memberName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {allocation.memberNumber}
                        </p>
                      </DashboardTableCell>
                      <DashboardTableCell>
                        {formatDate(allocation.joinedAt)}
                      </DashboardTableCell>
                      <DashboardTableCell align="right">
                        {formatCurrency(allocation.shareBalance)}
                      </DashboardTableCell>
                      <DashboardTableCell align="right">
                        {allocationMode === "percentage" ? (
                          <Input
                            className="text-right"
                            disabled={isLocked}
                            max="100"
                            min="0"
                            name={`allocationPercent-${allocation.memberId}`}
                            onChange={(event) =>
                              setAllocationPercentages((values) => ({
                                ...values,
                                [allocation.memberId]: event.target.value,
                              }))
                            }
                            step="0.0001"
                            type="number"
                            value={percentageValue}
                          />
                        ) : (
                          `${computedPercentage.toFixed(4)}%`
                        )}
                      </DashboardTableCell>
                      <DashboardTableCell align="right">
                        {allocationMode === "value" ? (
                          <CurrencyPrefixInput
                            disabled={isLocked}
                            min="0"
                            name={`allocationValue-${allocation.memberId}`}
                            onChange={(event) =>
                              setAllocationValues((values) => ({
                                ...values,
                                [allocation.memberId]: event.target.value,
                              }))
                            }
                            step="0.01"
                            type="number"
                            value={dividendValue}
                          />
                        ) : (
                          formatCurrency(computedDividend)
                        )}
                      </DashboardTableCell>
                    </DashboardTableRow>
                  )
                })}
              </DashboardTableBody>
            </DashboardTable>
          </DashboardDataTable>
        </section>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-background/95 py-3 backdrop-blur md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Save is available when allocated total equals shareable dividend
            within {formatCurrency(0.01)}.
          </p>
          <Button disabled={cannotSave} type="submit">
            Save worksheet
          </Button>
        </div>
      </form>
    </div>
  )
}
