"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"

export type DividendPeriodOption = {
  id: string
  label: string
}

export type BusinessProfitEntry = {
  allocatedProfitAmount: number
  allocationCount: number
  allocatableProfitAmount: number
  expenseAmount: number
  hasPublishedAllocations: boolean
  id: string
  linkedDividendPeriod?: {
    id: string
    name: string
    status: string
  } | null
  notes?: string | null
  profitAmount: number
  profitDate: string
  reason?: string | null
  sourceType: string
  status: string
}

export type Business = {
  capitalAmount: number
  endDate: string | null
  id: string
  linkedDividendPeriod?: {
    id: string
    name: string
    status: string
  } | null
  name: string
  notes?: string | null
  profitAmount: number
  profitEntries: BusinessProfitEntry[]
  startDate: string
  status: string
}

function latestProfitEntry(business: Business) {
  return business.profitEntries[0] ?? null
}

export const columns: ColumnDef<Business>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-foreground">{row.original.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.original.notes ?? "No note"}
        </p>
      </div>
    ),
    header: "Business",
  },
  {
    accessorKey: "startDate",
    cell: ({ row }) =>
      `${row.original.startDate} -> ${row.original.endDate ?? "Ongoing"}`,
    header: "Period",
  },
  {
    accessorKey: "capitalAmount",
    cell: ({ row }) => formatCurrency(row.original.capitalAmount),
    header: "Capital",
  },
  {
    accessorKey: "profitAmount",
    cell: ({ row }) => {
      const total =
        row.original.profitEntries.reduce(
          (sum, entry) => sum + entry.allocatableProfitAmount,
          0
        ) || row.original.profitAmount

      return <span className="font-medium">{formatCurrency(total)}</span>
    },
    header: "Allocatable profit",
  },
  {
    id: "latestProfitEntry",
    cell: ({ row }) => {
      const latest = latestProfitEntry(row.original)

      if (!latest) {
        return <span className="text-muted-foreground">No profit entry</span>
      }

      return (
        <div>
          <p className="font-medium text-foreground">
            {formatCurrency(latest.allocatableProfitAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest.profitDate} · {latest.status}
          </p>
        </div>
      )
    },
    header: "Latest profit entry",
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
    header: "Status",
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const meta = table.options.meta as {
        isLocked: boolean
        onAddProfit: (id: string) => void
        onEditBusiness: (id: string) => void
        onEditProfit: (businessId: string, profitEntryId: string) => void
      }
      const latest = latestProfitEntry(row.original)

      return (
        <div className="flex justify-end gap-2">
          <Button
            disabled={meta.isLocked}
            onClick={(event) => {
              event.stopPropagation()
              meta.onAddProfit(row.original.id)
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Profit
          </Button>
          <Button
            disabled={meta.isLocked}
            onClick={(event) => {
              event.stopPropagation()
              meta.onEditBusiness(row.original.id)
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Edit
          </Button>
          <Button
            disabled={
              meta.isLocked || !latest?.id || latest.hasPublishedAllocations
            }
            onClick={(event) => {
              event.stopPropagation()
              if (latest?.id) {
                meta.onEditProfit(row.original.id, latest.id)
              }
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Entry
          </Button>
        </div>
      )
    },
  },
]
