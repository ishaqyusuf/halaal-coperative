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
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useProjectFinancingStore } from "@/store/project-financing"
import {
  ROW_HEIGHTS,
  STICKY_COLUMNS,
  SUMMARY_GRID_HEIGHTS,
} from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import { ProjectFinancingEmptyState } from "./empty-states"
import { ProjectFinancingTableHeader } from "./table-header"
import { useProjectFinancingQuery } from "./use-project-financing-query"

const NON_CLICKABLE_COLUMNS = new Set(["actions"])
const COLUMN_IDS = getColumnIds(columns)

type Props = {
  canReview: boolean
  initialSettings?: Partial<TableSettings>
}

export function ProjectFinancingDataTable({
  canReview,
  initialSettings,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { setParams } = useProjectFinancingParams()
  const { setColumns } = useProjectFinancingStore()
  const {
    fetchNextPage,
    hasFilters,
    hasNextPage,
    isFetchingNextPage,
    requests: tableData,
  } = useProjectFinancingQuery()

  useScrollHeader(parentRef, {
    extraOffset: SUMMARY_GRID_HEIGHTS.projectFinancing,
  })

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
    tableId: "projectFinancing",
  })

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: tableData,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: { canReview },
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
    stickyColumns: STICKY_COLUMNS.projectFinancing,
    table,
  })
  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })
  const rows = table.getRowModel().rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => ROW_HEIGHTS.projectFinancing,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  })

  const openRequest = useCallback(
    (id?: string) => {
      if (!id) return

      const request = tableData.find((candidate) => candidate.id === id)
      if (!request) return

      const projectFinancingSheetType =
        canReview && ["submitted", "under_review"].includes(request.status)
          ? "review"
          : canReview && request.status === "approved"
            ? "disbursement"
            : "details"

      void setParams({
        projectFinancingRequestId: id,
        projectFinancingSheetType,
      })
    },
    [canReview, setParams, tableData]
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
    return <ProjectFinancingEmptyState filtered={hasFilters} />
  }

  return (
    <div className="relative">
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
          id="project-financing-table-dnd"
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <Table className="w-full min-w-full">
            <ProjectFinancingTableHeader
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
              {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
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
                    onCellClick={openRequest}
                    row={row}
                    rowHeight={ROW_HEIGHTS.projectFinancing}
                    virtualStart={virtualRow.start}
                  />
                )
              })}
              {!rows.length ? (
                <TableRow>
                  <TableCell className="h-24 text-center" colSpan={columns.length}>
                    No results.
                  </TableCell>
                </TableRow>
              ) : null}
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
