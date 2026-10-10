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
import { useFoodPurchaseParams } from "@/hooks/use-food-purchase-params"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useFoodPurchaseStore } from "@/store/food-purchase"
import {
  ROW_HEIGHTS,
  STICKY_COLUMNS,
  SUMMARY_GRID_HEIGHTS,
} from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import { FoodPurchaseEmptyState } from "./empty-states"
import { FoodPurchaseTableHeader } from "./table-header"
import { useFoodPurchaseQuery } from "./use-food-purchase-query"

const NON_CLICKABLE_COLUMNS = new Set(["actions"])
const COLUMN_IDS = getColumnIds(columns)

type Props = {
  canReviewApplications: boolean
  initialSettings?: Partial<TableSettings>
}

export function FoodPurchaseDataTable({
  canReviewApplications,
  initialSettings,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { setParams } = useFoodPurchaseParams()
  const { setColumns } = useFoodPurchaseStore()
  const {
    applications: tableData,
    fetchNextPage,
    hasActiveControls,
    hasNextPage,
    isFetchingNextPage,
  } = useFoodPurchaseQuery()

  useScrollHeader(parentRef, { extraOffset: SUMMARY_GRID_HEIGHTS.foodPurchase })

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
    tableId: "foodPurchase",
  })

  const tableMeta = useMemo(
    () => ({
      canReviewApplications,
    }),
    [canReviewApplications]
  )

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: tableData,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: tableMeta,
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
    stickyColumns: STICKY_COLUMNS.foodPurchase,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.foodPurchase
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  })

  const openApplication = useCallback(
    (id?: string) => {
      if (!id || !canReviewApplications) {
        return
      }

      const application = tableData.find((candidate) => candidate.id === id)

      if (
        !application ||
        application.cycle.status !== "open" ||
        !["submitted", "under_review"].includes(application.status)
      ) {
        return
      }

      setParams({
        foodPurchaseApplicationId: id,
        foodPurchaseCycleId: null,
        foodPurchaseSheetType: "review",
      })
    },
    [canReviewApplications, tableData, setParams]
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

  if (!tableData.length) {
    return <FoodPurchaseEmptyState filtered={hasActiveControls} />
  }

  const virtualItems = rowVirtualizer.getVirtualItems()
  return (
    <div className="relative">
      <div className="w-full">
        <div
          className="scrollbar-hide overflow-auto overscroll-contain border-x border-b border-border"
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
            id="food-purchase-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <FoodPurchaseTableHeader
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
                        isSelected={false}
                        key={row.id}
                        nonClickableColumns={NON_CLICKABLE_COLUMNS}
                        onCellClick={openApplication}
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
