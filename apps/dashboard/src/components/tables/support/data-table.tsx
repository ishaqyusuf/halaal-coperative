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
import { useCallback, useEffect, useMemo, useRef } from "react"
import { VirtualRow } from "@/components/tables/core"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useSupportCaseParams } from "@/hooks/use-support-case-params"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useSupportStore } from "@/store/support"
import {
  ROW_HEIGHTS,
  STICKY_COLUMNS,
  SUMMARY_GRID_HEIGHTS,
} from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import { SupportEmptyState, SupportNoResults } from "./empty-states"
import { SupportTableHeader } from "./table-header"
import { useSupportQuery } from "./use-support-query"

const NON_CLICKABLE_COLUMNS = new Set(["actions"])
const COLUMN_IDS = getColumnIds(columns)

type Props = {
  canReviewFinancialAdjustments: boolean
  initialSettings?: Partial<TableSettings>
  mode?: "member" | "staff"
}

export function SupportDataTable({
  canReviewFinancialAdjustments,
  initialSettings,
  mode = "staff",
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { setParams } = useSupportCaseParams()
  const { setColumns } = useSupportStore()
  const {
    fetchNextPage,
    hasActiveControls,
    hasNextPage,
    isFetchingNextPage,
    supportCases,
  } = useSupportQuery(mode)

  useScrollHeader(parentRef, { extraOffset: SUMMARY_GRID_HEIGHTS.support })

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
    tableId: "support",
  })
  const tableMeta = useMemo(
    () => ({ canReviewFinancialAdjustments, mode }),
    [canReviewFinancialAdjustments, mode]
  )
  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: supportCases,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: tableMeta,
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
    stickyColumns: STICKY_COLUMNS.support,
    table,
  })
  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })
  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.support
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  })
  const openCase = useCallback(
    (id?: string) => {
      if (!id) return

      void setParams({
        supportCaseId: id,
        supportCaseSheetType: mode === "member" ? "member-reply" : "update",
      })
    },
    [mode, setParams]
  )

  useInfiniteScroll<HTMLDivElement>({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    rowCount: rows.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 50,
  })

  if (!supportCases.length && hasActiveControls) {
    return <SupportNoResults />
  }

  if (!supportCases.length) {
    return <SupportEmptyState mode={mode} />
  }

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className="relative">
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
          id="support-table-dnd"
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <Table className="w-full min-w-full">
            <SupportTableHeader table={table} tableScroll={tableScroll} />
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
                      isSelected={false}
                      key={row.id}
                      nonClickableColumns={NON_CLICKABLE_COLUMNS}
                      onCellClick={openCase}
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
