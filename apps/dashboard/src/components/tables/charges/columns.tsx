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
        <p className="mt-1 text-xs tracking-[0.18em] text-muted-foreground uppercase">
          {row.original.code}
        </p>
      </div>
    ),
    header: "Charge",
  },
  {
    accessorKey: "chargeFrequency",
    cell: ({ row }) => formatLabel(row.original.chargeFrequency),
    header: "Frequency",
  },
  {
    accessorKey: "currentVersion.amount",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatChargeValue(row.original.currentVersion)}
      </span>
    ),
    header: "Current amount",
  },
  {
    accessorKey: "chargeValueType",
    cell: ({ row }) =>
      row.original.chargeValueType === "percentage"
        ? "Percentage"
        : "Fixed amount",
    header: "Value type",
  },
  {
    accessorKey: "versions",
    cell: ({ row }) => `${row.original.versions.length} versions`,
    header: "History",
  },
  {
    accessorKey: "isActive",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
    header: "Status",
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
  },
]
