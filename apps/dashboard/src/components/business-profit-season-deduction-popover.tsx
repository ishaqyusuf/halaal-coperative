"use client"

import { useMemo, useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@halaalvest/ui/components/popover"
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
  seasonKey,
}: {
  initialAmount: number
  initialReason?: string | null
  maxAmount: number
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
  const totalAmount = lines.reduce(
    (total, line) => total + parseAmount(line.amount),
    0
  )
  const reasonSummary =
    lines
      .map((line) => line.reason.trim())
      .filter(Boolean)
      .join("; ") || ""

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
      <Popover>
        <PopoverTrigger
          render={
            <Button size="sm" type="button" variant="outline">
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
        <PopoverContent align="end" className="w-[520px] gap-3" sideOffset={8}>
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
          <div className="grid gap-2">
            {lines.map((line) => (
              <div
                className="grid grid-cols-[140px_minmax(0,1fr)_32px] items-center gap-2"
                key={line.id}
              >
                <CurrencyInput
                  allowNegative={false}
                  decimalScale={2}
                  inputMode="decimal"
                  isAllowed={(values) =>
                    !values.floatValue || values.floatValue <= maxAmount
                  }
                  onValueChange={(values) =>
                    updateLine(line.id, { amount: values.value })
                  }
                  placeholder="Amount"
                  value={line.amount}
                  valueIsNumericString
                />
                <Input
                  onChange={(event) =>
                    updateLine(line.id, { reason: event.target.value })
                  }
                  placeholder="Reason"
                  value={line.reason}
                />
                <Button
                  aria-label="Delete deduction line"
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
            className="w-full"
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
            Add More
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
