"use client"

import { useState } from "react"
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { cn } from "@halaalvest/ui/lib/utils"

export type LedgerColumnKey =
  | "action"
  | "commitment"
  | "finalSaving"
  | "loanBalance"
  | "period"
  | "repayment"
  | "share"
  | "stampDuty"
  | "totalSaving"

type LedgerColumnVisibilityItem = {
  defaultVisible: boolean
  disabled?: boolean
  key: LedgerColumnKey
  label: string
}

export type LedgerColumnSummaryItem = {
  columnKey: LedgerColumnKey
  label: string
  labelClassName?: string
  value: string
}

type LedgerColumnVisibilityFrameProps = {
  afterSavingsControl?: React.ReactNode
  children: React.ReactNode
  columns: LedgerColumnVisibilityItem[]
  metadataItems: LedgerColumnSummaryItem[]
}

const hiddenColumnClassByKey: Partial<Record<LedgerColumnKey, string>> = {
  commitment: "[&_.commitment-column]:hidden",
  finalSaving: "[&_.final-saving-column]:hidden",
  loanBalance: "[&_.loan-balance-column]:hidden",
  repayment: "[&_.repayment-column]:hidden",
  share: "[&_.share-column]:hidden",
  stampDuty: "[&_.stamp-duty-column]:hidden",
  totalSaving: "[&_.total-saving-column]:hidden",
}

const hiddenSummaryClassByKey: Partial<Record<LedgerColumnKey, string>> = {
  commitment: "[&_.commitment-summary-when-hidden]:hidden",
  finalSaving: "[&_.final-saving-summary-when-hidden]:hidden",
  loanBalance: "[&_.loan-balance-summary-when-hidden]:hidden",
  repayment: "[&_.repayment-summary-when-hidden]:hidden",
  share: "[&_.share-summary-when-hidden]:hidden",
  stampDuty: "[&_.stamp-duty-summary-when-hidden]:hidden",
  totalSaving: "[&_.total-saving-summary-when-hidden]:hidden",
}

export function LedgerColumnVisibilityFrame({
  afterSavingsControl,
  children,
  columns,
  metadataItems,
}: LedgerColumnVisibilityFrameProps) {
  const [visibleColumns, setVisibleColumns] = useState(() =>
    Object.fromEntries(
      columns.map((column) => [
        column.key,
        column.disabled ? true : column.defaultVisible,
      ])
    ) as Record<LedgerColumnKey, boolean>
  )

  function isColumnVisible(column: LedgerColumnVisibilityItem) {
    return column.disabled || visibleColumns[column.key]
  }

  function isColumnKeyVisible(key: LedgerColumnKey) {
    const column = columns.find((item) => item.key === key)

    return column ? isColumnVisible(column) : true
  }

  function showColumn(key: LedgerColumnKey) {
    setVisibleColumns((current) => ({
      ...current,
      [key]: true,
    }))
  }

  return (
    <div
      className={cn(
        columns.map((column) =>
          !isColumnVisible(column) ? hiddenColumnClassByKey[column.key] : null
        ),
        columns.map((column) =>
          isColumnVisible(column) ? hiddenSummaryClassByKey[column.key] : null
        )
      )}
    >
      <div className="mb-2 flex flex-col gap-2 border-y border-border/70 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {metadataItems
            .filter((item) => !isColumnKeyVisible(item.columnKey))
            .map((item) => (
              <button
                className="inline-flex items-center gap-1.5 border border-border/70 px-2 py-1 text-[11px] transition-colors hover:border-foreground/30 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={item.columnKey}
                type="button"
                onClick={() => showColumn(item.columnKey)}
              >
                <span className={cn("font-medium", item.labelClassName)}>
                  {item.label}
                </span>
                <span className="text-foreground">{item.value}</span>
              </button>
            ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {afterSavingsControl}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label="Choose visible ledger columns"
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon
                aria-hidden="true"
                className="size-3.5"
                icon={FilterHorizontalIcon}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    checked={isColumnVisible(column)}
                    disabled={column.disabled}
                    key={column.key}
                    onCheckedChange={(checked) => {
                      if (column.disabled) {
                        return
                      }

                      setVisibleColumns((current) => ({
                        ...current,
                        [column.key]: Boolean(checked),
                      }))
                    }}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {children}
    </div>
  )
}
