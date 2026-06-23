"use client"

import { useState } from "react"
import { cn } from "@halaalvest/ui/lib/utils"

type LedgerColumnVisibilityFrameProps = {
  afterSavingsControl?: React.ReactNode
  children: React.ReactNode
  forceRepaymentColumns: boolean
  forceSavingsColumn: boolean
  hasLoanColumns: boolean
  metadata: React.ReactNode
}

function SegmentToggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground",
        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
      )}
    >
      <input
        checked={checked}
        className="size-3.5"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  )
}

export function LedgerColumnVisibilityFrame({
  afterSavingsControl,
  children,
  forceRepaymentColumns,
  forceSavingsColumn,
  hasLoanColumns,
  metadata,
}: LedgerColumnVisibilityFrameProps) {
  const [showSavingsColumn, setShowSavingsColumn] = useState(false)
  const [showRepaymentColumns, setShowRepaymentColumns] = useState(false)
  const shouldShowSavingsColumn = forceSavingsColumn || showSavingsColumn
  const shouldShowRepaymentColumns =
    forceRepaymentColumns || showRepaymentColumns

  return (
    <div
      className={cn(
        !shouldShowSavingsColumn && "[&_.savings-column]:hidden",
        !shouldShowRepaymentColumns && "[&_.repayment-column]:hidden"
      )}
    >
      <div className="mb-2 flex flex-col gap-2 border-y border-border/70 py-2 sm:flex-row sm:items-center sm:justify-between">
        {metadata}
        <div className="flex flex-wrap items-center gap-3">
          <SegmentToggle
            checked={shouldShowSavingsColumn}
            disabled={forceSavingsColumn}
            label="Savings"
            onChange={setShowSavingsColumn}
          />
          {afterSavingsControl}
          {hasLoanColumns ? (
            <SegmentToggle
              checked={shouldShowRepaymentColumns}
              disabled={forceRepaymentColumns}
              label="Loan repayment"
              onChange={setShowRepaymentColumns}
            />
          ) : null}
        </div>
      </div>
      {children}
    </div>
  )
}
