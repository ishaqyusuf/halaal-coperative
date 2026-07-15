"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"
import { OpenChargeToggleSheet } from "@/components/open-charge-operation-sheet"
import type { ChargeLibraryRow } from "./data-table"

export const columns: ColumnDef<ChargeLibraryRow>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => (
      <div>
        <p className="truncate font-medium text-foreground">
          {row.original.name}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground uppercase">
          {row.original.code}
        </p>
      </div>
    ),
    enableHiding: false,
    enableResizing: true,
    header: "Charge",
    id: "charge",
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
    accessorKey: "isActive",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-2">
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
        {row.original.isMonthlyLevy ? (
          <Badge variant="outline">Monthly levy</Badge>
        ) : null}
      </div>
    ),
    enableResizing: true,
    header: "Status",
    id: "status",
    meta: {
      className: "w-[190px] min-w-[150px]",
      headerLabel: "Status",
    },
    minSize: 150,
    size: 190,
  },
  {
    accessorKey: "kind",
    cell: ({ row }) => (
      <span className="text-muted-foreground capitalize">
        {row.original.kind.replace(/_/g, " ")}
      </span>
    ),
    enableResizing: true,
    header: "Kind",
    id: "kind",
    meta: {
      className: "w-[150px] min-w-[120px]",
      headerLabel: "Kind",
    },
    minSize: 120,
    size: 150,
  },
  {
    accessorKey: "currentEffectiveFrom",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.currentEffectiveFrom ?? "No dated version"}
      </span>
    ),
    enableResizing: true,
    header: "Current date",
    id: "effectiveFrom",
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Current date",
    },
    minSize: 150,
    size: 170,
  },
  {
    accessorKey: "amount",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(Number(row.original.amount))}
      </span>
    ),
    enableResizing: true,
    header: "Current amount",
    id: "amount",
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Current amount",
    },
    minSize: 150,
    size: 170,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as {
        canManageCharges: boolean
      }

      return meta.canManageCharges ? (
        <div className="flex justify-end">
          <OpenChargeToggleSheet
            chargeDefinitionId={row.original.id}
            isActive={row.original.isActive}
          />
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">View only</span>
      )
    },
    enableHiding: false,
    header: "Actions",
    id: "actions",
    maxSize: 180,
    meta: {
      className: "w-[160px] min-w-[140px] justify-end",
      headerLabel: "Actions",
    },
    minSize: 140,
    size: 160,
  },
]
