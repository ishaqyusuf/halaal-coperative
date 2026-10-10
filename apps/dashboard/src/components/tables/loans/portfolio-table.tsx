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
import { useEffect, useRef } from "react"
import { EmptyState, VirtualRow } from "@/components/tables/core"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useLoanTableStore } from "@/store/loans"
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { portfolioColumns } from "./portfolio-columns"
import { LoanTableHeader } from "./table-header"
import { useLoanPortfolioQuery } from "./use-loans-query"

export type LoanPortfolioRow = {
  estimatedMonthlyServicing: number | string | { toString(): string }
  extraMonthlySavingsAmount: number | string | { toString(): string }
  id: string
  loanProduct: { name: string }
  member: { fullName: string }
  outstandingPrincipal: number | string | { toString(): string }
  principalAmount: number | string | { toString(): string }
  status: string
  termMonths: number
}

const NON_CLICKABLE_COLUMNS = new Set(["actions"])
const COLUMN_IDS = getColumnIds(portfolioColumns)

export function LoanPortfolioTable({
  availablePool,
  canReview,
  initialSettings,
  memberId,
}: {
  availablePool: number
  canReview: boolean
  initialSettings?: Partial<TableSettings>
  memberId?: string
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { setPortfolioColumns } = useLoanTableStore()
  const {
    fetchNextPage,
    hasActiveControls,
    hasNextPage,
    isFetchingNextPage,
    loans: tableData,
  } = useLoanPortfolioQuery(memberId)

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
    tableId: "loanPortfolio",
  })

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns: portfolioColumns,
    data: tableData,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: {
      availablePool,
      canReview,
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
    setPortfolioColumns(table.getAllLeafColumns())
  }, [columnVisibility, setPortfolioColumns, table])

  const { getStickyClassName, getStickyStyle } = useStickyColumns({
    columnVisibility,
    stickyColumns: STICKY_COLUMNS.loanPortfolio,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.loanPortfolio
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
    return (
      <EmptyState
        description={
          hasActiveControls
            ? "Clear the current filters or choose a different status."
            : "Approved and live cooperative loans will appear here once requests move into servicing."
        }
        title={
          hasActiveControls
            ? "No matching loans"
            : "No approved or active loans"
        }
      />
    )
  }

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className="relative">
      <div className="w-full">
        <div
          className="scrollbar-hide overflow-auto overscroll-x-contain overscroll-y-auto border-x border-b border-border"
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
            id="loan-portfolio-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <LoanTableHeader
                table={table}
                tableId="loanPortfolio"
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
                        nonClickableColumns={NON_CLICKABLE_COLUMNS}
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
                      colSpan={portfolioColumns.length}
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
