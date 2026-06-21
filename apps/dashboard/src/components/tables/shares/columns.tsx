"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import type { ColumnDef } from "@tanstack/react-table"
import { formatCurrency } from "@halaalvest/utils"

export type Share = {
  amount: number
  basis: "after_charge_deductions"
  effectiveFrom: string
  id: string
  isCurrent: boolean
  notes?: string | null
  valueType: "fixed_amount" | "percentage"
}

const ActionsCell = ({
  disabled,
  onEdit,
  version,
}: {
  disabled: boolean
  onEdit: (id: string) => void
  version: Share
}) => {
  return (
    <Button
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onEdit(version.id)
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      Edit
    </Button>
  )
}

export const columns: ColumnDef<Share>[] = [
  {
    accessorKey: "effectiveFrom",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.effectiveFrom}</span>
    ),
    header: "Effective date",
    meta: {
      headerLabel: "Effective date",
    },
  },
  {
    accessorKey: "valueType",
    cell: ({ row }) =>
      row.original.valueType === "percentage"
        ? "Percentage after charges"
        : "Fixed amount",
    header: "Rule",
    meta: {
      headerLabel: "Rule",
    },
  },
  {
    accessorKey: "amount",
    cell: ({ row }) =>
      row.original.valueType === "percentage"
        ? `${row.original.amount}%`
        : formatCurrency(row.original.amount),
    header: "Value",
    meta: {
      headerLabel: "Value",
    },
  },
  {
    accessorKey: "notes",
    cell: ({ row }) => row.original.notes ?? "-",
    header: "Notes",
    meta: {
      headerLabel: "Notes",
    },
  },
  {
    accessorKey: "isCurrent",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.isCurrent ? "Current" : "Historical"}
      </Badge>
    ),
    header: "Status",
    meta: {
      headerLabel: "Status",
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const meta = table.options.meta as {
        isLocked: boolean
        onEdit: (id: string) => void
      }

      return (
        <ActionsCell
          disabled={meta.isLocked}
          onEdit={meta.onEdit}
          version={row.original}
        />
      )
    },
  },
]
