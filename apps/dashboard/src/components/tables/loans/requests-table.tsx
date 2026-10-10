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
import { requestColumns } from "./request-columns"
import { LoanTableHeader } from "./table-header"
import { useLoanRequestsQuery } from "./use-loans-query"

export type LoanRequestRow = {
  approvals: Array<{
    action: string
    actedAt: Date
    actorUser: { fullName: string }
    id: string
    notes?: string | null
  }>
  eligibleAmountSnapshot: number | string | { toString(): string }
  estimatedMonthlyServicing: number | string | { toString(): string }
  extraMonthlySavingsAmount: number | string | { toString(): string }
  guarantorApprovals: Array<{
    guarantorMember: {
      fullName: string
      memberNumber: string
    }
    id: string
    requestedAt: Date
    respondedAt?: Date | null
    respondedByUser?: { fullName: string } | null
    responseNotes?: string | null
    status: "approved" | "pending" | "rejected"
  }>
  id: string
  loanProduct: { name: string }
  member: { fullName: string }
  purpose?: string | null
  requestedAmount: number | string | { toString(): string }
  requestedTermMonths: number
  reviewNotes?: string | null
  status: string
}

const NON_CLICKABLE_COLUMNS = new Set(["actions", "review"])
const COLUMN_IDS = getColumnIds(requestColumns)

export function LoanRequestsTable({
  canReview,
  initialSettings,
  memberId,
}: {
  canReview: boolean
  initialSettings?: Partial<TableSettings>
  memberId?: string
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { setRequestColumns } = useLoanTableStore()
  const {
    fetchNextPage,
    hasActiveControls,
    hasNextPage,
    isFetchingNextPage,
    requests: tableData,
  } = useLoanRequestsQuery(memberId)

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
    tableId: "loanRequests",
  })

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns: requestColumns,
    data: tableData,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: {
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
    setRequestColumns(table.getAllLeafColumns())
  }, [columnVisibility, setRequestColumns, table])

  const { getStickyClassName, getStickyStyle } = useStickyColumns({
    columnVisibility,
    stickyColumns: STICKY_COLUMNS.loanRequests,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.loanRequests
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
            : "Submitted member loan requests will appear here for review and approval."
        }
        title={
          hasActiveControls
            ? "No matching loan requests"
            : "No loan requests yet"
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
            id="loan-requests-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <LoanTableHeader
                table={table}
                tableId="loanRequests"
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
                      colSpan={requestColumns.length}
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
