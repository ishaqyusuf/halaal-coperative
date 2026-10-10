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
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useShareApplicationsStore } from "@/store/share-applications"
import {
  ROW_HEIGHTS,
  STICKY_COLUMNS,
  SUMMARY_GRID_HEIGHTS,
} from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import { ShareApplicationsEmptyState } from "./empty-states"
import { ShareApplicationsTableHeader } from "./table-header"
import { useShareApplicationsQuery } from "./use-share-applications-query"

const NON_CLICKABLE_COLUMNS = new Set(["actions"])

type Props = {
  canReview?: boolean
  initialSettings?: Partial<TableSettings>
}

export function ShareApplicationsDataTable({
  canReview = false,
  initialSettings,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { setParams } = useShareApplicationParams()
  const { setColumns } = useShareApplicationsStore()
  const {
    applications: tableData,
    fetchNextPage,
    hasActiveControls,
    hasNextPage,
    isFetchingNextPage,
  } = useShareApplicationsQuery()
  const tableColumns = useMemo(
    () =>
      canReview
        ? columns
        : columns.filter(
            (column) => (column as { id?: string }).id !== "actions"
          ),
    [canReview]
  )
  const columnIds = useMemo(() => getColumnIds(tableColumns), [tableColumns])

  useScrollHeader(parentRef, {
    extraOffset: SUMMARY_GRID_HEIGHTS.shareApplications,
  })

  const {
    columnOrder,
    columnSizing,
    columnVisibility,
    setColumnOrder,
    setColumnSizing,
    setColumnVisibility,
  } = useTableSettings({
    columnIds,
    initialSettings,
    tableId: "shareApplications",
  })

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns: tableColumns,
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
    stickyColumns: STICKY_COLUMNS.shareApplications,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.shareApplications
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  })

  const openApplication = useCallback(
    (id?: string) => {
      if (!id) {
        return
      }

      if (canReview) {
        const application = tableData.find((candidate) => candidate.id === id)
        if (application?.status !== "pending") {
          return
        }

        setParams({
          shareApplicationId: id,
          shareApplicationSheetType: "review",
        })
        return
      }

      setParams({
        shareApplicationId: id,
        shareApplicationSheetType: "details",
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
    return <ShareApplicationsEmptyState filtered={hasActiveControls} />
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
            id="share-applications-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-[920px]">
              <ShareApplicationsTableHeader
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
                      colSpan={tableColumns.length}
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
