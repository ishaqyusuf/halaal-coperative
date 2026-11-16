"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@halaalvest/ui/components/dialog"
import { usePreservedClientState } from "@halaalvest/ui/hooks/use-preserved-form-state"
import { formatCurrency } from "@halaalvest/utils"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

type DeductionLine = {
  amount: string
  id: string
  reason: string
}

const quickFillReasons = [
  "Board reserve",
  "Audit provision",
  "Operating cost allocation",
  "Season review adjustment",
  "Administrative expense",
]

function createDeductionLine(line?: Partial<DeductionLine>): DeductionLine {
  return {
    amount: line?.amount ?? "",
    id:
      line?.id ??
      `deduction-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    reason: line?.reason ?? "",
  }
}

function parseAmount(value: string) {
  const amount = Number(value || 0)

  return Number.isFinite(amount) ? amount : 0
}

function splitExistingReasons(reason: string | null | undefined) {
  return (reason ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function BusinessProfitSeasonDeductionPopover({
  initialAmount,
  initialReason,
  maxAmount,
  onTotalAmountChange,
  preserveDraftKey,
  quickFillEnabled = false,
  seasonKey,
}: {
  initialAmount: number
  initialReason?: string | null
  maxAmount: number
  onTotalAmountChange?: (amount: number) => void
  preserveDraftKey?: string
  // QA Quick fill; pass the server-owned `canShowQuickFill(context)` value.
  quickFillEnabled?: boolean
  seasonKey: string
}) {
  const initialLines = useMemo(() => {
    if (!initialAmount) {
      return [createDeductionLine()]
    }

    const reasons = splitExistingReasons(initialReason)

    return [
      createDeductionLine({
        amount: String(initialAmount),
        reason: reasons.join("; "),
      }),
    ]
  }, [initialAmount, initialReason])
  const [lines, setLines] = useState<DeductionLine[]>(initialLines)
  const restoreLines = useCallback((storedLines: DeductionLine[]) => {
    if (!Array.isArray(storedLines)) {
      return
    }

    const validLines = storedLines.filter(
      (line) =>
        line &&
        typeof line.amount === "string" &&
        typeof line.id === "string" &&
        typeof line.reason === "string"
    )

    setLines(validLines.length > 0 ? validLines : [createDeductionLine()])
  }, [])
  usePreservedClientState({
    enabled: Boolean(preserveDraftKey),
    onRestore: restoreLines,
    storageKey: preserveDraftKey ?? "business-profit-season-deduction",
    value: lines,
  })
  const totalAmount = lines.reduce(
    (total, line) => total + parseAmount(line.amount),
    0
  )
  const reasonSummary =
    lines
      .map((line) => line.reason.trim())
      .filter(Boolean)
      .join("; ") || ""

  useEffect(() => {
    onTotalAmountChange?.(totalAmount)
  }, [onTotalAmountChange, totalAmount])

  function updateLine(lineId: string, patch: Partial<DeductionLine>) {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.id === lineId ? { ...line, ...patch } : line
      )
    )
  }

  function deleteLine(lineId: string) {
    setLines((currentLines) => {
      const nextLines = currentLines.filter((line) => line.id !== lineId)

      return nextLines.length > 0 ? nextLines : [createDeductionLine()]
    })
  }

  function quickFillLines() {
    const safeMaxAmount = Math.max(0, Math.floor(maxAmount))

    if (safeMaxAmount <= 0) {
      return
    }

    const maxTargetTotal = Math.max(
      1,
      Math.min(safeMaxAmount, Math.round(safeMaxAmount * 0.08))
    )
    const minTargetTotal = Math.min(
      maxTargetTotal,
      Math.max(1, Math.round(safeMaxAmount * 0.02))
    )
    let remainingAmount = randomInt(minTargetTotal, maxTargetTotal)
    const lineCount = randomInt(1, Math.min(3, remainingAmount))

    setLines(
      Array.from({ length: lineCount }, (_, index) => {
        const remainingLines = lineCount - index
        const amount =
          remainingLines === 1
            ? remainingAmount
            : randomInt(1, remainingAmount - (remainingLines - 1))

        remainingAmount -= amount

        return createDeductionLine({
          amount: String(amount),
          reason: quickFillReasons[index % quickFillReasons.length],
        })
      })
    )
  }

  return (
    <div className="flex justify-end">
      <input
        name={`deductionAmount-${seasonKey}`}
        type="hidden"
        value={String(totalAmount)}
      />
      <input
        name={`deductionReason-${seasonKey}`}
        type="hidden"
        value={reasonSummary}
      />
      {/* A row editor, so a dialog rather than a popover (R17): popovers
          hold a single value, and the 520px popover overflowed phones. The
          dialog renders outside the form; only the hidden inputs submit. */}
      <Dialog>
        <DialogTrigger
          render={
            <Button
              className="h-11 sm:h-8"
              size="sm"
              type="button"
              variant="outline"
            >
              {totalAmount > 0 ? (
                <>
                  <span className="tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
                  <PencilIcon className="size-3.5" />
                </>
              ) : (
                <>
                  <PlusIcon className="size-3.5" />
                  Add
                </>
              )}
            </Button>
          }
        />
        <DialogContent className="gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Season deduction</DialogTitle>
            <DialogDescription>
              Taken out before the profit is shared. Up to{" "}
              {formatCurrency(maxAmount)} in total.
            </DialogDescription>
          </DialogHeader>
          {quickFillEnabled ? (
            <div className="flex justify-end">
              <Button
                disabled={maxAmount <= 0}
                onClick={quickFillLines}
                size="sm"
                type="button"
                variant="ghost"
              >
                Quick fill
              </Button>
            </div>
          ) : null}
          <div className="grid gap-3">
            {lines.map((line) => (
              // Phones: amount and Remove on one row, the reason below.
              <div
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]"
                key={line.id}
              >
                <CurrencyInput
                  allowNegative={false}
                  aria-label="Amount"
                  className="h-11 sm:h-8"
                  decimalScale={2}
                  inputMode="decimal"
                  isAllowed={(values) => {
                    const nextLineAmount = values.floatValue ?? 0
                    const otherLineTotal =
                      totalAmount - parseAmount(line.amount)

                    return otherLineTotal + nextLineAmount <= maxAmount
                  }}
                  onValueChange={(values) =>
                    updateLine(line.id, { amount: values.value })
                  }
                  placeholder="Amount"
                  value={line.amount}
                  valueIsNumericString
                />
                <Input
                  aria-label="Reason"
                  className="col-span-2 row-start-2 h-11 sm:col-span-1 sm:row-start-auto sm:h-8"
                  onChange={(event) =>
                    updateLine(line.id, { reason: event.target.value })
                  }
                  placeholder="Reason"
                  value={line.reason}
                />
                <Button
                  aria-label="Delete deduction line"
                  className="size-11 sm:size-8"
                  onClick={() => deleteLine(line.id)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            className="h-11 w-full sm:h-8"
            onClick={() =>
              setLines((currentLines) => [
                ...currentLines,
                createDeductionLine(),
              ])
            }
            type="button"
            variant="outline"
          >
            <PlusIcon className="size-3.5" />
            Add another
          </Button>
          <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Total{" "}
              <span className="text-foreground tabular-nums">
                {formatCurrency(totalAmount)}
              </span>
            </p>
            <DialogClose
              render={
                <Button
                  className="h-11 w-full sm:h-8 sm:w-auto"
                  type="button"
                />
              }
            >
              Done
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function BusinessProfitSeasonDeductionFields({
  initialAmount,
  initialReason,
  maxAmount,
  preserveDraftKey,
  quickFillEnabled = false,
  seasonKey,
}: {
  initialAmount: number
  initialReason?: string | null
  maxAmount: number
  preserveDraftKey?: string
  quickFillEnabled?: boolean
  seasonKey: string
}) {
  const [deductionAmount, setDeductionAmount] = useState(initialAmount)
  const distributableAmount = Math.max(0, maxAmount - deductionAmount)

  return (
    <>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground sm:text-right">
          Season deduction
        </p>
        <BusinessProfitSeasonDeductionPopover
          initialAmount={initialAmount}
          initialReason={initialReason}
          maxAmount={maxAmount}
          onTotalAmountChange={setDeductionAmount}
          preserveDraftKey={preserveDraftKey}
          quickFillEnabled={quickFillEnabled}
          seasonKey={seasonKey}
        />
      </div>
      <div className="sm:text-right">
        <p className="text-xs font-medium text-muted-foreground">
          Left to share
        </p>
        <p className="mt-1 text-sm">{formatCurrency(distributableAmount)}</p>
      </div>
    </>
  )
}
