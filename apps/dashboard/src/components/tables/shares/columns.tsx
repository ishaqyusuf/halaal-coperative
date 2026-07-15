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
    enableHiding: false,
    enableResizing: true,
    header: "Effective date",
    id: "effectiveFrom",
    maxSize: 260,
    meta: {
      className:
        "w-[180px] min-w-[160px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Effective date",
      sticky: true,
    },
    minSize: 160,
    size: 180,
  },
  {
    accessorKey: "valueType",
    cell: ({ row }) =>
      row.original.valueType === "percentage"
        ? "Percentage after charges"
        : "Fixed amount",
    enableResizing: true,
    header: "Rule",
    id: "valueType",
    maxSize: 280,
    meta: {
      headerLabel: "Rule",
      className: "w-[220px] min-w-[180px]",
    },
    minSize: 180,
    size: 220,
  },
  {
    accessorKey: "amount",
    cell: ({ row }) =>
      row.original.valueType === "percentage"
        ? `${row.original.amount}%`
        : formatCurrency(row.original.amount),
    enableResizing: true,
    header: "Value",
    id: "amount",
    maxSize: 220,
    meta: {
      headerLabel: "Value",
      className: "w-[170px] min-w-[140px]",
    },
    minSize: 140,
    size: 170,
  },
  {
    accessorKey: "notes",
    cell: ({ row }) => row.original.notes ?? "-",
    enableResizing: true,
    header: "Notes",
    id: "notes",
    maxSize: 420,
    meta: {
      headerLabel: "Notes",
      className: "w-[260px] min-w-[180px]",
    },
    minSize: 180,
    size: 260,
  },
  {
    accessorKey: "isCurrent",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.isCurrent ? "Current" : "Historical"}
      </Badge>
    ),
    enableResizing: true,
    header: "Status",
    id: "isCurrent",
    maxSize: 190,
    meta: {
      headerLabel: "Status",
      className: "w-[150px] min-w-[130px]",
    },
    minSize: 130,
    size: 150,
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
    enableHiding: false,
    enableResizing: false,
    maxSize: 120,
    meta: {
      headerLabel: "Actions",
      className:
        "w-[120px] min-w-[120px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
    },
    minSize: 120,
    size: 120,
  },
]
