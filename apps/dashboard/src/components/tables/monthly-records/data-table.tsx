"use client"

import { closestCenter, DndContext } from "@dnd-kit/core"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@halaalvest/ui/components/table"
import { getCoreRowModel } from "@tanstack/react-table"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { useEffect, useRef } from "react"
import type { MonthlyRecordMemberRow } from "@halaalvest/db"
import { VirtualRow } from "@/components/tables/core"
import { useDataTable } from "@/hooks/use-data-table"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useMonthlyRecordsTableStore } from "@/store/monthly-records"
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import { MonthlyRecordsEmptyState, MonthlyRecordsNoResults } from "./empty-states"
import { MonthlyRecordsTableHeader } from "./table-header"
import { useMonthlyRecordsQuery } from "./use-monthly-records-query"

export type MonthlyRecordMemberTableRow = MonthlyRecordMemberRow

const COLUMN_IDS = getColumnIds(columns)

export function MonthlyRecordsDataTable({
  initialSettings,
  month,
  monthlyRecordId,
  periodLabel,
  year,
}: {
  initialSettings?: Partial<TableSettings>
  month?: number
  monthlyRecordId?: string | null
  periodLabel?: string
  year?: number
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { setColumns } = useMonthlyRecordsTableStore()
  const {
    fetchNextPage,
    hasFilters,
    hasNextPage,
    isFetchingNextPage,
    rows: tableData,
  } = useMonthlyRecordsQuery(monthlyRecordId)

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

  const table = useDataTable({
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

  if (!tableData.length) {
    return hasFilters ? (
      <MonthlyRecordsNoResults />
    ) : (
      <MonthlyRecordsEmptyState
        month={month}
        periodLabel={monthlyRecordId ? periodLabel : undefined}
        year={year}
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
            height: "calc(100vh - 380px + var(--header-offset, 0px))",
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
