"use client"

import { Button } from "@halaalvest/ui/components/button"
import { ButtonGroup } from "@halaalvest/ui/components/button-group"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@halaalvest/ui/components/popover"
import { formatCurrency } from "@halaalvest/utils"
import { PencilIcon, PlusIcon } from "lucide-react"

export type MemberProfitSeasonAdjustmentMode = "fixed" | "percentage"

export type MemberProfitSeasonAdjustmentValue = {
  amount: string
  mode: MemberProfitSeasonAdjustmentMode
  sharePercentage: string
}

function formatPercentage(value: string) {
  const percentage = Number(value)

  if (!Number.isFinite(percentage)) {
    return "0%"
  }

  return `${percentage}%`
}

export function MemberProfitSeasonAdjustmentPopover({
  disabled,
  onChange,
  seasonKey,
  value,
}: {
  disabled: boolean
  onChange: (value: MemberProfitSeasonAdjustmentValue) => void
  seasonKey: string
  value: MemberProfitSeasonAdjustmentValue
}) {
  const activeFixedAmount = value.mode === "fixed" ? value.amount : ""
  const activeSharePercentage =
    value.mode === "percentage" ? value.sharePercentage.trim() : ""
  const fixedAmount = Number(value.amount || 0)
  const hasFixedAmount =
    value.mode === "fixed" && Number.isFinite(fixedAmount) && fixedAmount > 0
  const hasSharePercentage = activeSharePercentage.length > 0

  return (
    <div className="flex justify-end">
      <input
        name={`allocatedProfitAmount-${seasonKey}`}
        type="hidden"
        value={activeFixedAmount}
      />
      <input
        name={`sharePercentage-${seasonKey}`}
        type="hidden"
        value={activeSharePercentage}
      />
      <Popover>
        <PopoverTrigger
          render={
            <Button
              disabled={disabled}
              size="sm"
              type="button"
              variant="outline"
            >
              {hasFixedAmount ? (
                <>
                  <span className="tabular-nums">
                    {formatCurrency(fixedAmount)}
                  </span>
                  <PencilIcon className="size-3.5" />
                </>
              ) : hasSharePercentage ? (
                <>
                  <span className="tabular-nums">
                    {formatPercentage(activeSharePercentage)}
                  </span>
                  <PencilIcon className="size-3.5" />
                </>
              ) : (
                <>
                  <PlusIcon className="size-3.5" />
                  Set
                </>
              )}
            </Button>
          }
        />
        <PopoverContent align="end" className="w-[160px] gap-3" sideOffset={8}>
          <ButtonGroup className="w-full">
            <Button
              aria-pressed={value.mode === "fixed"}
              className="flex-1 px-2 text-xs"
              onClick={() => onChange({ ...value, mode: "fixed" })}
              size="sm"
              type="button"
              variant={value.mode === "fixed" ? "default" : "outline"}
            >
              Fixed
            </Button>
            <Button
              aria-pressed={value.mode === "percentage"}
              className="flex-1 px-2 text-xs"
              onClick={() => onChange({ ...value, mode: "percentage" })}
              size="sm"
              type="button"
              variant={value.mode === "percentage" ? "default" : "outline"}
            >
              Percentage
            </Button>
          </ButtonGroup>

          {value.mode === "fixed" ? (
            <CurrencyInput
              allowNegative={false}
              decimalScale={2}
              inputMode="decimal"
              onValueChange={(values) =>
                onChange({ ...value, amount: values.value })
              }
              placeholder="Amount"
              value={value.amount}
              valueIsNumericString
            />
          ) : (
            <InputGroup>
              <InputGroupInput
                className="text-right"
                inputMode="decimal"
                max="100"
                min="0"
                onChange={(event) =>
                  onChange({ ...value, sharePercentage: event.target.value })
                }
                placeholder="Percentage"
                step="0.01"
                type="number"
                value={value.sharePercentage}
              />
              <InputGroupAddon align="inline-end">%</InputGroupAddon>
            </InputGroup>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
