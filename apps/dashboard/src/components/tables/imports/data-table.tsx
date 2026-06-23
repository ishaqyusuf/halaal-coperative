"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UiTableHeader,
  TableRow,
} from "@halaalvest/ui/components/table"
import { TrendPill } from "@/components/dashboard"
import { ImportSheet } from "@/components/sheets/import-sheet"
import { useImportFilterParams } from "@/hooks/use-import-filter-params"
import { useImportParams } from "@/hooks/use-import-params"
import {
  dashboardImportConfigs,
  type DashboardImportKind,
  type DashboardImportReferenceData,
} from "@/lib/import-csv"
import type {
  ImportAvailability,
  ImportBatchSummary,
} from "@/components/forms/import-forms"

export type ImportBatchRow = ImportBatchSummary & {
  errorMessage?: string | null
  rows?: Array<{
    duplicateInFile: boolean
    existingMatch: boolean
    id: string
    primaryValue: string | null
    rowIndex: number
  }>
  totalRows?: number
}

type Props = {
  batches: ImportBatchRow[]
  devMode: boolean
  importAvailability: ImportAvailability
  importKind?: DashboardImportKind
  referenceData: DashboardImportReferenceData
}

function formatImportKind(kind: string) {
  return kind.replace(/_/g, " ")
}

function getImportTitle(kind: string) {
  return kind in dashboardImportConfigs
    ? dashboardImportConfigs[kind as DashboardImportKind].title
    : formatImportKind(kind)
}

export function DataTable({
  batches,
  devMode,
  importAvailability,
  importKind,
  referenceData,
}: Props) {
  const { filter } = useImportFilterParams()
  const { setParams } = useImportParams()
  const scopedRows = importKind
    ? batches.filter((batch) => batch.importType === importKind)
    : batches
  const searchValue = filter.q?.toLowerCase() ?? ""
  const rows = scopedRows.filter((batch) => {
    const matchesStatus = !filter.status || batch.status === filter.status
    const searchable = [
      getImportTitle(batch.importType),
      batch.status,
      batch.createdByUser.fullName,
      batch.createdByUser.email,
      batch.validRows.toString(),
      (batch.totalRows ?? batch._count.rows).toString(),
    ]
      .join(" ")
      .toLowerCase()

    return matchesStatus && (!searchValue || searchable.includes(searchValue))
  })

  return (
    <div className="w-full">
      <Table>
        <UiTableHeader>
          <TableRow>
            <TableHead>Import</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rows</TableHead>
            <TableHead>Review</TableHead>
            <TableHead>Created by</TableHead>
          </TableRow>
        </UiTableHeader>
        <TableBody>
          {rows.map((batch) => (
            <TableRow
              className="cursor-pointer hover:bg-muted/50"
              key={batch.id}
              onClick={() =>
                setParams({
                  importBatchId: batch.id,
                  importSheetType: "details",
                  importType: batch.importType,
                })
              }
            >
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">
                    {getImportTitle(batch.importType)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {batch.createdAt.toISOString().slice(0, 10)}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <TrendPill
                  tone={batch.status === "applied" ? "positive" : "neutral"}
                >
                  {batch.status}
                </TrendPill>
              </TableCell>
              <TableCell>
                {batch.validRows}/{batch.totalRows ?? batch._count.rows}
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {batch.existingMatchCount} matches ·{" "}
                  {batch.duplicateRowCount} duplicates
                </span>
              </TableCell>
              <TableCell>{batch.createdByUser.fullName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!scopedRows.length ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No {importKind ? getImportTitle(importKind).toLowerCase() : "import"}{" "}
          batches yet.
        </p>
      ) : null}
      {scopedRows.length > 0 && !rows.length ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No import batches match the current filters.
        </p>
      ) : null}

      <ImportSheet
        batches={batches}
        devMode={devMode}
        importAvailability={importAvailability}
        importKind={importKind}
        referenceData={referenceData}
      />
    </div>
  )
}
