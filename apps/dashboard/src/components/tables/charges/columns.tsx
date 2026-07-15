"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"

export type ChargeVersion = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  effectiveFrom: string
  id: string
  notes?: string | null
  status: "current" | "historical" | "scheduled"
}

export type Charge = {
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
  appliesToMembers?: boolean
  chargeFrequency:
    | "recurring_monthly"
    | "per_contribution"
    | "one_time"
    | "manual"
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  currentVersion?: ChargeVersion | null
  id: string
  isActive: boolean
  kind: string
  name: string
  purpose?: "general" | "member_share" | "loan_fee" | "membership_fee" | "penalty"
  versions: ChargeVersion[]
}

function formatChargeValue(version?: ChargeVersion | null) {
  if (!version) {
    return "-"
  }

  return version.chargeValueType === "percentage"
    ? `${version.amount}%`
    : formatCurrency(version.amount)
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ")
}

export const columns: ColumnDef<Charge>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-foreground">{row.original.name}</p>
        <p className="mt-1 text-xs text-muted-foreground uppercase">
          {row.original.code}
        </p>
      </div>
    ),
    enableHiding: false,
    enableResizing: true,
    header: "Charge",
    id: "name",
    maxSize: 460,
    meta: {
      className:
        "w-[300px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Charge",
      sticky: true,
    },
    minSize: 240,
    size: 300,
  },
  {
    accessorKey: "chargeFrequency",
    cell: ({ row }) => formatLabel(row.original.chargeFrequency),
    enableResizing: true,
    header: "Frequency",
    id: "chargeFrequency",
    meta: {
      className: "w-[180px] min-w-[150px]",
      headerLabel: "Frequency",
    },
    minSize: 150,
    size: 180,
  },
  {
    accessorKey: "currentVersion.amount",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatChargeValue(row.original.currentVersion)}
      </span>
    ),
    enableResizing: true,
    header: "Current amount",
    id: "currentVersion.amount",
    meta: {
      className: "w-[180px] min-w-[150px]",
      headerLabel: "Current amount",
    },
    minSize: 150,
    size: 180,
  },
  {
    accessorKey: "chargeValueType",
    cell: ({ row }) =>
      row.original.chargeValueType === "percentage"
        ? "Percentage"
        : "Fixed amount",
    enableResizing: true,
    header: "Value type",
    id: "chargeValueType",
    meta: {
      className: "w-[170px] min-w-[140px]",
      headerLabel: "Value type",
    },
    minSize: 140,
    size: 170,
  },
  {
    accessorKey: "versions",
    cell: ({ row }) => `${row.original.versions.length} versions`,
    enableResizing: true,
    header: "History",
    id: "versions",
    meta: {
      className: "w-[150px] min-w-[120px]",
      headerLabel: "History",
    },
    minSize: 120,
    size: 150,
  },
  {
    accessorKey: "isActive",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
    enableResizing: true,
    header: "Status",
    id: "isActive",
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Status",
    },
    minSize: 120,
    size: 140,
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const meta = table.options.meta as {
        isLocked: boolean
        onAddUpdate: (id: string) => void
        onEditVersion: (chargeId: string, versionId: string) => void
      }
      const currentVersion = row.original.currentVersion

      return (
        <div className="flex justify-end gap-2">
          <Button
            disabled={meta.isLocked}
            onClick={(event) => {
              event.stopPropagation()
              meta.onAddUpdate(row.original.id)
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Update
          </Button>
          <Button
            disabled={meta.isLocked || !currentVersion}
            onClick={(event) => {
              event.stopPropagation()
              if (currentVersion) {
                meta.onEditVersion(row.original.id, currentVersion.id)
              }
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Edit
          </Button>
        </div>
      )
    },
    enableHiding: false,
    enableResizing: false,
    maxSize: 180,
    meta: {
      className:
        "w-[180px] min-w-[180px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Actions",
    },
    minSize: 180,
    size: 180,
  },
]
