"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Badge } from "@halaalvest/ui/components/badge"
import type { ColumnDef } from "@tanstack/react-table"
import type { ImportBatchRow } from "./data-table"

type ImportTableMeta = {
  onOpenApply: (batch: ImportBatchRow) => void
  onOpenDetails: (batch: ImportBatchRow) => void
}

function formatImportKind(kind: string) {
  return kind.replace(/_/g, " ")
}

function displayStatus(status: string) {
  return status.replace(/_/g, " ")
}

function StatusBadge({ status }: { status: string }) {
  const applied = status === "applied"

  return (
    <Badge
      className={
        applied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }
      variant="outline"
    >
      {displayStatus(status)}
    </Badge>
  )
}

export const columns: ColumnDef<ImportBatchRow>[] = [
  {
    accessorKey: "importType",
    cell: ({ row }) => (
      <div>
        <p className="truncate font-medium capitalize text-foreground">
          {formatImportKind(row.original.importType)}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.createdAt.toISOString().slice(0, 10)}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Import",
    id: "import",
    maxSize: 520,
    meta: {
      className:
        "w-[300px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Import",
      sticky: true,
    },
    minSize: 240,
    size: 300,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Status",
    },
    minSize: 120,
    size: 140,
  },
  {
    cell: ({ row }) => (
      <span>
        {row.original.validRows}/
        {row.original.totalRows ?? row.original._count.rows}
      </span>
    ),
    enableResizing: true,
    header: "Rows",
    id: "rows",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Rows",
    },
    minSize: 120,
    size: 140,
  },
  {
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.existingMatchCount} matches ·{" "}
        {row.original.duplicateRowCount} duplicates
      </span>
    ),
    enableResizing: true,
    header: "Review",
    id: "review",
    maxSize: 260,
    meta: {
      className: "w-[220px] min-w-[180px]",
      headerLabel: "Review",
    },
    minSize: 180,
    size: 220,
  },
  {
    accessorFn: (row) => row.createdByUser.fullName,
    cell: ({ row }) => (
      <div>
        <p className="truncate text-foreground">
          {row.original.createdByUser.fullName}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.createdByUser.email}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Created by",
    id: "createdBy",
    maxSize: 260,
    meta: {
      className: "w-[220px] min-w-[180px]",
      headerLabel: "Created by",
    },
    minSize: 180,
    size: 220,
  },
  {
    accessorFn: (row) => row.createdAt.toISOString(),
    cell: ({ row }) => row.original.createdAt.toISOString().slice(0, 10),
    enableResizing: true,
    header: "Created",
    id: "createdAt",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Created",
    },
    minSize: 120,
    size: 140,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as ImportTableMeta
      const isApplied = row.original.status === "applied"

      return (
        <div className="flex w-full justify-end gap-2">
          <Button
            onClick={(event) => {
              event.stopPropagation()
              meta.onOpenDetails(row.original)
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Review
          </Button>
          <Button
            disabled={isApplied}
            onClick={(event) => {
              event.stopPropagation()
              meta.onOpenApply(row.original)
            }}
            size="sm"
            type="button"
          >
            Apply
          </Button>
        </div>
      )
    },
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: "Actions",
    id: "actions",
    maxSize: 180,
    meta: {
      className:
        "text-right sticky right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-30 justify-center !border-l !border-border",
      headerLabel: "Actions",
      sticky: true,
    },
    minSize: 180,
    size: 180,
  },
]
