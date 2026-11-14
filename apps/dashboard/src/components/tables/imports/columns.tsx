"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ImportStatusBadge } from "@/components/imports/import-status-badge"
import {
  dashboardImportConfigs,
  type DashboardImportKind,
} from "@/lib/import-csv"
import { importCount, importKindWords } from "@/lib/imports/import-words"
import { formatDayMonthYear } from "@/utils/format"
import type { ImportBatchRow } from "./data-table"

export function importBatchTitle(batch: ImportBatchRow) {
  const kind =
    batch.importType in dashboardImportConfigs
      ? (batch.importType as DashboardImportKind)
      : null

  return kind
    ? {
        count: importCount(kind, batch.totalRows),
        title: importKindWords[kind].title,
      }
    : { count: `${batch.totalRows} rows`, title: batch.importType }
}

export const columns: ColumnDef<ImportBatchRow>[] = [
  {
    accessorKey: "importType",
    cell: ({ row }) => {
      const { count, title } = importBatchTitle(row.original)
      return (
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-foreground">
            {title}
          </p>
          <p className="truncate text-sm text-muted-foreground">{count}</p>
        </div>
      )
    },
    enableResizing: true,
    header: "What",
    id: "import",
    maxSize: 520,
    meta: {
      className:
        "w-[300px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "What",
      sticky: true,
    },
    minSize: 240,
    size: 300,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <ImportStatusBadge status={row.original.status} />,
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 200,
    meta: {
      className: "w-[160px] min-w-[140px]",
      headerLabel: "Status",
    },
    minSize: 140,
    size: 160,
  },
  {
    accessorFn: (row) => row.createdByUser.fullName,
    cell: ({ row }) => (
      <span className="truncate text-base text-foreground">
        {row.original.createdByUser.fullName}
      </span>
    ),
    enableResizing: true,
    header: "By",
    id: "createdBy",
    maxSize: 320,
    meta: {
      className: "w-[240px] min-w-[180px]",
      headerLabel: "By",
    },
    minSize: 180,
    size: 240,
  },
  {
    accessorFn: (row) => row.createdAt.toISOString(),
    cell: ({ row }) => (
      <span className="text-base">
        {formatDayMonthYear(row.original.appliedAt ?? row.original.createdAt)}
      </span>
    ),
    enableResizing: true,
    header: "Date",
    id: "createdAt",
    maxSize: 200,
    meta: {
      className: "w-[160px] min-w-[140px]",
      headerLabel: "Date",
    },
    minSize: 140,
    size: 160,
  },
]
