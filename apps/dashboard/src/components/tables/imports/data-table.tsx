"use client"

import { closestCenter, DndContext } from "@dnd-kit/core"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@halaalvest/ui/components/table"
import { useInfiniteQuery } from "@tanstack/react-query"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from "react"
import { VirtualRow } from "@/components/tables/core"
import { ImportSheet } from "@/components/sheets/import-sheet"
import { useImportFilterParams } from "@/hooks/use-import-filter-params"
import { useImportParams } from "@/hooks/use-import-params"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useImportStore } from "@/store/imports"
import { useTRPC } from "@/trpc/client"
import { getEnumValue } from "@/utils/enum"
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import {
  dashboardImportConfigs,
  type DashboardImportKind,
  type DashboardImportReferenceData,
} from "@/lib/import-csv"
import type {
  ImportAvailability,
  ImportBatchSummary,
} from "@/components/forms/import-forms"
import { columns } from "./columns"
import { ImportEmptyState, ImportNoResults } from "./empty-states"
import { Loading } from "./skeleton"
import { ImportTableHeader } from "./table-header"

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

type ImportSortField =
  | "createdAt"
  | "createdBy"
  | "importType"
  | "reviewCount"
  | "status"
  | "totalRows"

type Props = {
  devMode: boolean
  hasSourceRows?: boolean
  importAvailability: ImportAvailability
  importKind?: DashboardImportKind
  initialSettings?: Partial<TableSettings>
  referenceData: DashboardImportReferenceData
  remoteRows?: boolean
  sheetBatches: ImportBatchRow[]
}

const NON_CLICKABLE_COLUMNS = new Set(["actions"])
const COLUMN_IDS = getColumnIds(columns)

function formatImportKind(kind: string) {
  return kind.replace(/_/g, " ")
}

function getImportTitle(kind: string) {
  return kind in dashboardImportConfigs
    ? dashboardImportConfigs[kind as DashboardImportKind].title
    : formatImportKind(kind)
}

function getSort(
  sort?: string[] | null
): [ImportSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "createdAt",
    "createdBy",
    "importType",
    "reviewCount",
    "status",
    "totalRows",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as ImportSortField, direction]
}

function sortRows(
  rows: ImportBatchRow[],
  sort?: [ImportSortField, "asc" | "desc"] | null
) {
  if (!sort) return rows

  const [field, direction] = sort
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = getSortValue(left, field)
    const rightValue = getSortValue(right, field)

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor
    }

    return String(leftValue).localeCompare(String(rightValue)) * factor
  })
}

function getSortValue(row: ImportBatchRow, field: ImportSortField) {
  if (field === "createdAt") return row.createdAt.getTime()
  if (field === "createdBy") return row.createdByUser.fullName
  if (field === "reviewCount") {
    return row.existingMatchCount + row.duplicateRowCount
  }
  if (field === "totalRows") return row.totalRows ?? row._count.rows
  return row[field]
}

export function DataTable({
  devMode,
  hasSourceRows,
  importAvailability,
  importKind,
  initialSettings,
  referenceData,
  remoteRows = true,
  sheetBatches,
}: Props) {
  const trpc = useTRPC()
  const { filter } = useImportFilterParams()
  const { setParams } = useImportParams()
  const { params } = useSortParams()
  const parentRef = useRef<HTMLDivElement>(null)
  const { setColumns } = useImportStore()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () => ({
      importType: importKind,
      q: deferredSearch || undefined,
      sort: getSort(params.sort),
      status: getEnumValue(filter.status, [
        "applied",
        "draft",
        "failed",
      ] as const),
    }),
    [deferredSearch, filter.status, importKind, params.sort]
  )
  const infiniteQueryOptions = trpc.imports.batches.infiniteQueryOptions(
    queryInput,
    {
      enabled: remoteRows,
      getNextPageParam: ({ meta }) => meta?.cursor,
      refetchInterval: 5000,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    }
  )
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery(infiniteQueryOptions)
  const searchValue = filter.q?.toLowerCase() ?? ""
  const localRows = useMemo(
    () =>
      sheetBatches
        .filter((batch) => (importKind ? batch.importType === importKind : true))
        .filter((batch) => {
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

          return (
            matchesStatus && (!searchValue || searchable.includes(searchValue))
          )
        }),
    [filter.status, importKind, searchValue, sheetBatches]
  )
  const tableData = useMemo(
    () =>
      remoteRows
        ? (data?.pages.flatMap((page) => page.data) ?? [])
        : sortRows(localRows, getSort(params.sort)),
    [data, localRows, params.sort, remoteRows]
  )

  const {
    columnOrder,
    columnSizing,
    columnVisibility,
    setColumnOrder,
    setColumnSizing,
    setColumnVisibility,
  } = useTableSettings({
    columnIds: COLUMN_IDS,
    initialSettings,
    tableId: "imports",
  })

  const openBatch = useCallback(
    (batch: ImportBatchRow, sheetType: "apply" | "details" = "details") => {
      setParams({
        importBatchId: batch.id,
        importSheetType: sheetType,
        importType: batch.importType,
      })
    },
    [setParams]
  )

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: tableData,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: {
      onOpenApply: (batch: ImportBatchRow) => openBatch(batch, "apply"),
      onOpenDetails: (batch: ImportBatchRow) => openBatch(batch),
    },
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnOrder,
      columnSizing,
      columnVisibility,
    },
  })

  const { sensors, handleDragEnd } = useTableDnd(table)

  useEffect(() => {
    setColumns(table.getAllLeafColumns())
  }, [columnVisibility, setColumns, table])

  const { getStickyClassName, getStickyStyle } = useStickyColumns({
    columnVisibility,
    stickyColumns: STICKY_COLUMNS.imports,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.imports
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  })
  useInfiniteScroll<HTMLDivElement>({
    fetchNextPage,
    hasNextPage: remoteRows ? hasNextPage : false,
    isFetchingNextPage,
    rowCount: rows.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 50,
  })

  if (remoteRows && isPending) {
    return <Loading />
  }

  const hasRows = hasSourceRows ?? tableData.length > 0
  const hasFilteredRows = rows.length > 0

  if (remoteRows && isError) {
    return (
      <div className="w-full">
        <ImportNoResults />
        <ImportSheet
          batches={sheetBatches}
          devMode={devMode}
          importAvailability={importAvailability}
          importKind={importKind}
          referenceData={referenceData}
        />
      </div>
    )
  }

  if (!hasRows) {
    return (
      <div className="w-full">
        <ImportEmptyState
          title={`No ${
            importKind ? getImportTitle(importKind).toLowerCase() : "import"
          } batches yet.`}
        />
        <ImportSheet
          batches={sheetBatches}
          devMode={devMode}
          importAvailability={importAvailability}
          importKind={importKind}
          referenceData={referenceData}
        />
      </div>
    )
  }

  if (!hasFilteredRows) {
    return (
      <div className="w-full">
        <ImportNoResults />
        <ImportSheet
          batches={sheetBatches}
          devMode={devMode}
          importAvailability={importAvailability}
          importKind={importKind}
          referenceData={referenceData}
        />
      </div>
    )
  }

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className="relative">
      <div className="w-full">
        <div
          className="overflow-auto overscroll-contain border-x border-b border-border scrollbar-hide"
          ref={(element) => {
            parentRef.current = element
            tableScroll.containerRef.current = element
          }}
          style={{
            height: "calc(100vh - 350px + var(--header-offset, 0px))",
          }}
        >
          <DndContext
            collisionDetection={closestCenter}
            id="imports-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <ImportTableHeader table={table} tableScroll={tableScroll} />

              <TableBody
                className="block border-x-0"
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                }}
              >
                {virtualItems.length > 0 ? (
                  virtualItems.map((virtualRow: VirtualItem) => {
                    const row = rows[virtualRow.index]
                    if (!row) return null

                    return (
                      <VirtualRow
                        columnOrder={columnOrder}
                        columnSizing={columnSizing}
                        columnVisibility={columnVisibility}
                        getStickyClassName={getStickyClassName}
                        getStickyStyle={getStickyStyle}
                        key={row.id}
                        nonClickableColumns={NON_CLICKABLE_COLUMNS}
                        onCellClick={(rowId) => {
                          const batch = tableData.find(
                            (item) => item.id === rowId
                          )
                          if (batch) openBatch(batch)
                        }}
                        row={row}
                        rowHeight={rowHeight}
                        virtualStart={virtualRow.start}
                      />
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      className="h-24 text-center"
                      colSpan={columns.length}
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
          <div
            aria-hidden
            style={{ flexShrink: 0, height: "var(--header-offset, 0px)" }}
          />
        </div>
      </div>

      <ImportSheet
        batches={sheetBatches}
        devMode={devMode}
        importAvailability={importAvailability}
        importKind={importKind}
        referenceData={referenceData}
      />
    </div>
  )
}
