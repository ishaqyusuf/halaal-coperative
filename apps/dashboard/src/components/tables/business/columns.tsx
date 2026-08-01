"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import { Badge } from "@halaalvest/ui/components/badge"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import { BusinessActionsMenu } from "./actions-menu"

export type Business = RouterOutputs["business"]["list"]["data"][number]
export type BusinessProfitEntry = Business["profitEntries"][number]
export type DividendPeriodOption =
  RouterOutputs["business"]["setup"]["dividendPeriods"][number]

type BusinessTableMeta = {
  isLocked: boolean
}

export function displayBusinessEnum(value: string) {
  return value.replaceAll("_", " ")
}

export function getLatestBusinessProfitEntry(business: Business) {
  return business.profitEntries[0] ?? null
}

export function getBusinessAllocatableProfit(business: Business) {
  return (
    business.profitEntries.reduce(
      (sum, entry) => sum + Number(entry.allocatableProfitAmount ?? 0),
      0
    ) || business.profitAmount
  )
}

const BusinessCell = memo(
  ({ name, notes }: { name: string; notes?: string | null }) => (
    <div>
      <p className="truncate font-medium text-foreground">{name}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {notes ?? "No note"}
      </p>
    </div>
  )
)

BusinessCell.displayName = "BusinessCell"

export const BusinessStatusBadge = memo(({ status }: { status: string }) => (
  <Badge
    className={
      status === "active"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : status === "completed"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
    }
    variant="outline"
  >
    {displayBusinessEnum(status)}
  </Badge>
))

BusinessStatusBadge.displayName = "BusinessStatusBadge"

export const columns: ColumnDef<Business>[] = [
  {
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.name}`}
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
      />
    ),
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    id: "select",
    maxSize: 50,
    meta: {
      className:
        "w-[50px] min-w-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20 justify-center",
      skeleton: { type: "checkbox" },
      sticky: true,
    },
    minSize: 50,
    size: 50,
  },
  {
    accessorKey: "name",
    cell: ({ row }) => (
      <BusinessCell name={row.original.name} notes={row.original.notes} />
    ),
    enableResizing: true,
    header: "Business",
    id: "business",
    maxSize: 520,
    meta: {
      className:
        "w-[320px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Business",
      skeleton: { type: "avatar-text", width: "w-36" },
      sticky: true,
    },
    minSize: 240,
    size: 320,
  },
  {
    accessorKey: "startDate",
    cell: ({ row }) => (
      <span>
        {row.original.startDate} to {row.original.endDate ?? "Ongoing"}
      </span>
    ),
    enableResizing: true,
    header: "Period",
    id: "period",
    maxSize: 280,
    meta: {
      className: "w-[220px] min-w-[180px]",
      headerLabel: "Period",
      skeleton: { type: "text", width: "w-28" },
    },
    minSize: 180,
    size: 220,
  },
  {
    accessorKey: "capitalAmount",
    cell: ({ row }) => formatCurrency(row.original.capitalAmount),
    enableResizing: true,
    header: "Capital",
    id: "capital",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[140px]",
      headerLabel: "Capital",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 140,
    size: 170,
  },
  {
    accessorKey: "profitAmount",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(getBusinessAllocatableProfit(row.original))}
      </span>
    ),
    enableResizing: true,
    header: "Allocatable profit",
    id: "profit",
    maxSize: 240,
    meta: {
      className: "w-[190px] min-w-[150px]",
      headerLabel: "Allocatable profit",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 150,
    size: 190,
  },
  {
    cell: ({ row }) => {
      const latest = getLatestBusinessProfitEntry(row.original)

      if (!latest) {
        return <span className="text-muted-foreground">No profit entry</span>
      }

      return (
        <div>
          <p className="truncate font-medium text-foreground">
            {formatCurrency(latest.allocatableProfitAmount)}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {latest.profitDate} · {displayBusinessEnum(latest.status)}
          </p>
        </div>
      )
    },
    enableResizing: true,
    header: "Latest profit",
    id: "latestProfitEntry",
    maxSize: 260,
    meta: {
      className: "w-[210px] min-w-[170px]",
      headerLabel: "Latest profit",
      skeleton: { type: "text", width: "w-28" },
    },
    minSize: 170,
    size: 210,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <BusinessStatusBadge status={row.original.status} />
    ),
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Status",
      skeleton: { type: "badge" },
    },
    minSize: 120,
    size: 140,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as BusinessTableMeta

      return (
        <BusinessActionsMenu
          business={row.original}
          isLocked={meta.isLocked}
        />
      )
    },
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: "Actions",
    id: "actions",
    maxSize: 110,
    meta: {
      className:
        "text-right sticky right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-30 justify-center !border-l !border-border",
      headerLabel: "Actions",
      skeleton: { type: "icon" },
      sticky: true,
    },
    minSize: 90,
    size: 90,
  },
]
