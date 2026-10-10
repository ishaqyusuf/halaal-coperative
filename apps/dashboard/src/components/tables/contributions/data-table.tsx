"use client"

import { closestCenter, DndContext } from "@dnd-kit/core"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@halaalvest/ui/components/table"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useEffect, useRef } from "react"
import { VirtualRow } from "@/components/tables/core"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useContributionsTableStore } from "@/store/contributions"
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import { ContributionsEmptyState } from "./empty-states"
import { ContributionsTableHeader } from "./table-header"
import { useContributionsQuery } from "./use-contributions-query"

const COLUMN_IDS = getColumnIds(columns)

export function ContributionsDataTable({
  initialSettings,
}: {
  initialSettings?: Partial<TableSettings>
}) {
  const query = useContributionsQuery()
  const parentRef = useRef<HTMLDivElement>(null)
  const { setColumns } = useContributionsTableStore()
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
    tableId: "contributions",
  })

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: query.rows,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    state: { columnOrder, columnSizing, columnVisibility },
  })
  const { sensors, handleDragEnd } = useTableDnd(table)

  useEffect(() => {
    setColumns(table.getAllLeafColumns())
  }, [columnVisibility, setColumns, table])

  const { getStickyClassName, getStickyStyle } = useStickyColumns({
    columnVisibility,
    stickyColumns: STICKY_COLUMNS.contributions,
    table,
  })
  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })
  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.contributions
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
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
    return <ContributionsEmptyState filtered={query.hasFilters} />
  }

  return (
    <div
      aria-busy={query.isFetchingNextPage}
      className="scrollbar-hide overflow-auto overscroll-x-contain overscroll-y-auto"
      ref={(element) => {
        parentRef.current = element
        tableScroll.containerRef.current = element
      }}
      style={{ height: "calc(100dvh - 310px + var(--header-offset, 0px))" }}
    >
      <DndContext
        collisionDetection={closestCenter}
        id="contributions-table-dnd"
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <Table className="w-full min-w-[920px]">
          <ContributionsTableHeader table={table} tableScroll={tableScroll} />
          <TableBody
            className="block border-x-0"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().length ? (
              rowVirtualizer
                .getVirtualItems()
                .map((virtualRow: VirtualItem) => {
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
      {query.isFetchingNextPage ? (
        <div className="flex h-12 items-center justify-center text-muted-foreground">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          <span className="sr-only">Loading more contribution records</span>
        </div>
      ) : null}
    </div>
  )
}
