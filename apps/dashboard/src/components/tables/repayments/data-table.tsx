"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@halaalvest/ui/components/table"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useCallback, useRef } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useRepaymentParams } from "@/hooks/use-repayment-params"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableSettings } from "@/hooks/use-table-settings"
import { STICKY_COLUMNS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { RepaymentsEmptyState } from "./empty-states"
import { historyColumns, scheduleColumns } from "./columns"
import { RepaymentsTableHeader } from "./table-header"
import type { RepaymentHistoryRow, RepaymentScheduleRow } from "./types"
import {
  useRepaymentHistoryQuery,
  useRepaymentScheduleQuery,
} from "./use-repayments-query"

type QueryResult<TData> = {
  fetchNextPage: () => void
  hasFilters: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  rows: TData[]
}

function RepaymentVirtualTable<TData extends { id: string }>({
  canPostRepayment,
  columns,
  emptyCopy,
  initialSettings,
  onOpen,
  query,
  tableId,
}: {
  canPostRepayment: boolean
  columns: ColumnDef<TData>[]
  emptyCopy: { description: string; filteredTitle: string; title: string }
  initialSettings?: Partial<TableSettings>
  onOpen: (item: TData) => void
  query: QueryResult<TData>
  tableId: "repaymentHistory" | "repaymentSchedule"
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const {
    columnOrder,
    columnSizing,
    columnVisibility,
    setColumnOrder,
    setColumnSizing,
    setColumnVisibility,
  } = useTableSettings({
    columnIds: getColumnIds(columns),
    initialSettings,
    tableId,
  })
  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: query.rows,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: { canPostRepayment },
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    state: { columnOrder, columnSizing, columnVisibility },
  })
  const { getStickyClassName, getStickyStyle } = useStickyColumns({
    columnVisibility,
    stickyColumns: STICKY_COLUMNS[tableId],
    table,
  })
  const rows = table.getRowModel().rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 72,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  })

  useScrollHeader(parentRef, { extraOffset: 24 })
  useInfiniteScroll<HTMLDivElement>({
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    rowCount: rows.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 50,
  })

  if (!query.rows.length) {
    return <RepaymentsEmptyState {...emptyCopy} filtered={query.hasFilters} />
  }

  return (
    <div
      aria-busy={query.isFetchingNextPage}
      className="scrollbar-hide overflow-auto overscroll-x-contain overscroll-y-auto"
      ref={parentRef}
      style={{ height: "calc(100dvh - 310px + var(--header-offset, 0px))" }}
    >
      <Table className="w-full min-w-[920px]">
        <RepaymentsTableHeader table={table} tableId={tableId} />
        <TableBody
          className="block"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
            const row = rows[virtualRow.index]
            if (!row) return null

            return (
              <TableRow
                className="group absolute top-0 left-0 flex min-w-full cursor-pointer border-b border-border hover:bg-muted/40"
                key={row.id}
                onClick={() => onOpen(row.original)}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    className={getStickyClassName(
                      cell.column.id,
                      "flex h-full items-center bg-background px-4 text-sm group-hover:bg-muted/40"
                    )}
                    key={cell.id}
                    onClick={
                      cell.column.id === "actions"
                        ? (event) => event.stopPropagation()
                        : undefined
                    }
                    style={{
                      width: cell.column.getSize(),
                      ...getStickyStyle(cell.column.id),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {query.isFetchingNextPage ? (
        <div className="flex h-12 items-center justify-center text-muted-foreground">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          <span className="sr-only">Loading more repayment records</span>
        </div>
      ) : null}
    </div>
  )
}

export function RepaymentScheduleDataTable({
  canPostRepayment,
  initialSettings,
  view,
}: {
  canPostRepayment: boolean
  initialSettings?: Partial<TableSettings>
  view: "collections" | "schedule"
}) {
  const query = useRepaymentScheduleQuery(view)
  const { setParams } = useRepaymentParams()
  const open = useCallback(
    (item: RepaymentScheduleRow) =>
      void setParams({
        loanId: null,
        repaymentId: null,
        repaymentScheduleItemId: item.id,
        repaymentSheetType: "scheduleDetails",
      }),
    [setParams]
  )

  return (
    <RepaymentVirtualTable
      canPostRepayment={canPostRepayment}
      columns={scheduleColumns}
      emptyCopy={{
        description:
          view === "collections"
            ? "Overdue repayment accounts will appear here for follow-up."
            : "Scheduled installments will appear after an approved loan is disbursed.",
        filteredTitle:
          view === "collections"
            ? "No matching collection cases"
            : "No matching schedule items",
        title:
          view === "collections"
            ? "No collection cases yet"
            : "No repayment schedule yet",
      }}
      initialSettings={initialSettings}
      onOpen={open}
      query={query}
      tableId="repaymentSchedule"
    />
  )
}

export function RepaymentHistoryDataTable({
  initialSettings,
}: {
  initialSettings?: Partial<TableSettings>
}) {
  const query = useRepaymentHistoryQuery()
  const { setParams } = useRepaymentParams()
  const open = useCallback(
    (item: RepaymentHistoryRow) =>
      void setParams({
        loanId: null,
        repaymentId: item.id,
        repaymentScheduleItemId: null,
        repaymentSheetType: "repaymentDetails",
      }),
    [setParams]
  )

  return (
    <RepaymentVirtualTable
      canPostRepayment={false}
      columns={historyColumns}
      emptyCopy={{
        description: "Posted repayment evidence will appear here.",
        filteredTitle: "No matching repayment history",
        title: "No repayments posted yet",
      }}
      initialSettings={initialSettings}
      onOpen={open}
      query={query}
      tableId="repaymentHistory"
    />
  )
}
