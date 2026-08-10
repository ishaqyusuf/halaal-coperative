"use client"

import { closestCenter, DndContext } from "@dnd-kit/core"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@halaalvest/ui/components/table"
import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
} from "react"
import type {
  ImportAvailability,
  ImportBatchSummary,
} from "@/components/forms/import-forms"
import { ImportSheet } from "@/components/sheets/import-sheet"
import { OpenImportSheet } from "@/components/open-import-sheet"
import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import { VirtualRow } from "@/components/tables/core"
import { useImportFilterParams } from "@/hooks/use-import-filter-params"
import { useImportParams } from "@/hooks/use-import-params"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import {
  type DashboardImportKind,
  type DashboardImportReferenceData,
  getDashboardImportBatchLabel,
} from "@/lib/import-csv"
import { getImportListInput } from "@/lib/imports/import-list-input"
import { useImportStore } from "@/store/imports"
import { useTRPC } from "@/trpc/client"
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import { ImportEmptyState, ImportNoResults } from "./empty-states"
import { ImportMobileList } from "./mobile-list"
import { Loading } from "./skeleton"
import { ImportTableHeader } from "./table-header"

export type ImportBatchRow = ImportBatchSummary & {
  errorMessage?: string | null
  rows?: Array<{
    duplicateInFile: boolean
    existingMatch: boolean
    id: string
    payload?: unknown
    primaryValue: string | null
    rowIndex: number
  }>
  totalRows?: number
}

type Props = {
  devMode: boolean
  importAvailability: ImportAvailability
  importKind?: DashboardImportKind
  initialSettings?: Partial<TableSettings>
  referenceData: DashboardImportReferenceData
}

type DesktopTableProps = {
  batches: ImportBatchRow[]
  fetchNextPage: () => Promise<unknown>
  hasNextPage: boolean
  initialSettings?: Partial<TableSettings>
  isFetchingNextPage: boolean
  onOpenApply: (batch: ImportBatchRow) => void
  onOpenDetails: (batch: ImportBatchRow) => void
}

const NON_CLICKABLE_COLUMNS = new Set(["actions"])
const COLUMN_IDS = getColumnIds(columns)

function ImportDesktopTable({
  batches,
  fetchNextPage,
  hasNextPage,
  initialSettings,
  isFetchingNextPage,
  onOpenApply,
  onOpenDetails,
}: DesktopTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { setColumns } = useImportStore()
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

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: batches,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: {
      onOpenApply,
      onOpenDetails,
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
    hasNextPage,
    isFetchingNextPage,
    rowCount: rows.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 50,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className="relative w-full">
      <div
        className="scrollbar-hide overflow-auto overscroll-contain border-x border-b border-border"
        ref={(element) => {
          parentRef.current = element
          tableScroll.containerRef.current = element
        }}
        style={{
          height:
            "max(360px, calc(100dvh - 350px + var(--header-offset, 0px)))",
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
                        const batch = batches.find((item) => item.id === rowId)
                        if (batch) onOpenDetails(batch)
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
  )
}

export function DataTable({
  devMode,
  importAvailability,
  importKind,
  initialSettings,
  referenceData,
}: Props) {
  const trpc = useTRPC()
  const { filter } = useImportFilterParams()
  const { setParams } = useImportParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () =>
      getImportListInput({
        importKind,
        q: deferredSearch,
        sort: params.sort,
        status: filter.status,
      }),
    [deferredSearch, filter.status, importKind, params.sort]
  )
  const infiniteQueryOptions = trpc.imports.batches.infiniteQueryOptions(
    queryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions)
  const batches = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )
  const hasDirectoryControls = Boolean(filter.q || filter.status)
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
  const openApply = useCallback(
    (batch: ImportBatchRow) => openBatch(batch, "apply"),
    [openBatch]
  )

  let dataView
  if (!batches.length && hasDirectoryControls) {
    dataView = <ImportNoResults />
  } else if (!batches.length) {
    dataView = (
      <ImportEmptyState
        action={
          importKind ? (
            <OpenImportSheet
              className="h-11 w-full md:h-9 md:w-auto"
              disabled={!importAvailability[importKind].isAvailable}
              display="label"
              importKind={importKind}
            />
          ) : null
        }
        title={
          importKind
            ? `No ${getDashboardImportBatchLabel(importKind)} import batches yet.`
            : "No import batches yet."
        }
      />
    )
  } else {
    dataView = (
      <ResponsiveDataView
        desktop={
          <ImportDesktopTable
            batches={batches}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            initialSettings={initialSettings}
            isFetchingNextPage={isFetchingNextPage}
            onOpenApply={openApply}
            onOpenDetails={openBatch}
          />
        }
        fallback={<Loading />}
        mobile={
          <ImportMobileList
            batches={batches}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onOpenApply={openApply}
            onOpenDetails={openBatch}
          />
        }
      />
    )
  }

  return (
    <div className="w-full">
      {dataView}
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
