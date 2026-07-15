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
import { useEffect, useMemo, useRef } from "react"
import type { MonthlyRecordMemberRow } from "@halaalvest/db"
import { EmptyState, VirtualRow } from "@/components/tables/core"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useMonthlyRecordsTableStore } from "@/store/monthly-records"
import { useTRPC } from "@/trpc/client"
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import { MonthlyRecordsSkeleton } from "./skeleton"
import { MonthlyRecordsTableHeader } from "./table-header"

export type MonthlyRecordMemberTableRow = MonthlyRecordMemberRow

type MonthlyRecordSortField =
  | "allChargesAmount"
  | "contributionAmount"
  | "currentBalance"
  | "finalIncomeAmount"
  | "loanRepaymentAmount"
  | "loanStatus"
  | "memberName"
  | "shareChargeAmount"
  | "status"
  | "totalPaidAmount"
  | "totalPayableAmount"

const COLUMN_IDS = getColumnIds(columns)

function getSort(
  sort?: string[] | null
): [MonthlyRecordSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "allChargesAmount",
    "contributionAmount",
    "currentBalance",
    "finalIncomeAmount",
    "loanRepaymentAmount",
    "loanStatus",
    "memberName",
    "shareChargeAmount",
    "status",
    "totalPaidAmount",
    "totalPayableAmount",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as MonthlyRecordSortField, direction]
}

export function MonthlyRecordsDataTable({
  initialSettings,
  monthlyRecordId,
}: {
  initialSettings?: Partial<TableSettings>
  monthlyRecordId?: string | null
}) {
  const trpc = useTRPC()
  const { params } = useSortParams()
  const parentRef = useRef<HTMLDivElement>(null)
  const { setColumns } = useMonthlyRecordsTableStore()
  const queryInput = useMemo(
    () => ({
      monthlyRecordId: monthlyRecordId ?? undefined,
      sort: getSort(params.sort),
    }),
    [monthlyRecordId, params.sort]
  )
  const infiniteQueryOptions = trpc.monthlyRecords.rows.infiniteQueryOptions(
    queryInput,
    {
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
  const tableData = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
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
    tableId: "monthlyRecords",
  })

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: tableData,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
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
    stickyColumns: STICKY_COLUMNS.monthlyRecords,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.monthlyRecords
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

  if (!monthlyRecordId) {
    return (
      <EmptyState
        description="Create or select a monthly record to review member rows."
        title="No members were found for this monthly record."
      />
    )
  }

  if (isPending) {
    return <MonthlyRecordsSkeleton />
  }

  if (isError) {
    return (
      <EmptyState
        description="Reload the page or select the monthly record again."
        title="Monthly record rows could not load."
      />
    )
  }

  if (!tableData.length) {
    return (
      <EmptyState
        description="Create or select a monthly record to review member rows."
        title="No members were found for this monthly record."
      />
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
            height: "calc(100vh - 430px + var(--header-offset, 0px))",
            minHeight: 360,
          }}
        >
          <DndContext
            collisionDetection={closestCenter}
            id="monthly-records-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <MonthlyRecordsTableHeader
                table={table}
                tableScroll={tableScroll}
              />

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
    </div>
  )
}
