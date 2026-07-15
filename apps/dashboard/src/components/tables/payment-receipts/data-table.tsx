"use client"

import { closestCenter, DndContext } from "@dnd-kit/core"
import { Button } from "@halaalvest/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@halaalvest/ui/components/table"
import { useInfiniteQuery } from "@tanstack/react-query"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { AnimatePresence } from "framer-motion"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { BottomBar, EmptyState, VirtualRow } from "@/components/tables/core"
import { usePaymentReceiptFilterParams } from "@/hooks/use-payment-receipt-filter-params"
import { usePaymentReceiptParams } from "@/hooks/use-payment-receipt-params"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { usePaymentReceiptsStore } from "@/store/payment-receipts"
import { useTRPC } from "@/trpc/client"
import {
  ROW_HEIGHTS,
  STICKY_COLUMNS,
  SUMMARY_GRID_HEIGHTS,
} from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns, type PaymentReceipt } from "./columns"
import { PaymentReceiptsEmptyState } from "./empty-states"
import { PaymentReceiptsSkeleton } from "./skeleton"
import { PaymentReceiptsTableHeader } from "./table-header"

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"])
const COLUMN_IDS = getColumnIds(columns)

type PaymentReceiptSortField =
  | "memberName"
  | "paidAt"
  | "paymentReference"
  | "status"
  | "submittedAt"
  | "totalAmount"

function getSort(
  sort?: string[] | null
): [PaymentReceiptSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, PaymentReceiptSortField> = {
    amount: "totalAmount",
    paidAt: "paidAt",
    receipt: "memberName",
    reference: "paymentReference",
    status: "status",
    submittedAt: "submittedAt",
    totalAmount: "totalAmount",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

type Props = {
  initialSettings?: Partial<TableSettings>
  mode?: "member" | "staff"
  receipts: PaymentReceipt[]
}

export function PaymentReceiptsDataTable({
  initialSettings,
  mode = "staff",
  receipts,
}: Props) {
  const trpc = useTRPC()
  const parentRef = useRef<HTMLDivElement>(null)
  const { filter } = usePaymentReceiptFilterParams()
  const { params } = useSortParams()
  const { setParams } = usePaymentReceiptParams()
  const { rowSelection, setColumns, setRowSelection } =
    usePaymentReceiptsStore()
  const queryInput = useMemo(
    () => ({
      q: filter.q || undefined,
      sort: getSort(params.sort),
      status:
        filter.status === "approved" ||
        filter.status === "correction_requested" ||
        filter.status === "rejected" ||
        filter.status === "submitted" ||
        filter.status === "under_review"
          ? filter.status
          : undefined,
    }),
    [filter.q, filter.status, params.sort]
  )
  const infiniteQueryOptions = trpc.paymentReceipts.list.infiniteQueryOptions(
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
    () => data?.pages.flatMap((page) => page.data) ?? receipts,
    [data, receipts]
  )

  useScrollHeader(parentRef, {
    extraOffset: SUMMARY_GRID_HEIGHTS.paymentReceipts,
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
    tableId: "paymentReceipts",
  })

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: tableData,
    enableColumnResizing: true,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: { mode },
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      columnOrder,
      columnSizing,
      columnVisibility,
      rowSelection,
    },
  })

  const { sensors, handleDragEnd } = useTableDnd(table)

  useEffect(() => {
    setColumns(table.getAllLeafColumns())
  }, [columnVisibility, setColumns, table])

  const { getStickyClassName, getStickyStyle } = useStickyColumns({
    columnVisibility,
    stickyColumns: STICKY_COLUMNS.paymentReceipts,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 2,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.paymentReceipts
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  })

  const openReceipt = useCallback(
    (id?: string) => {
      if (!id) {
        return
      }

      const receipt = tableData.find((candidate) => candidate.id === id)

      setParams({
        paymentReceiptId: id,
        paymentReceiptSheetType:
          mode === "member"
            ? "member-support"
            : receipt?.status === "approved" || receipt?.status === "rejected"
              ? "support"
              : "review",
      })
    },
    [mode, tableData, setParams]
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

  if (isPending && !receipts.length) {
    return <PaymentReceiptsSkeleton />
  }

  if (isError && !receipts.length) {
    return (
      <EmptyState
        description="Reload the page or adjust the receipt list before trying again."
        title="Payment receipts could not load."
      />
    )
  }

  if (!tableData.length) {
    return <PaymentReceiptsEmptyState />
  }

  const virtualItems = rowVirtualizer.getVirtualItems()
  const selectedRows = table.getSelectedRowModel().rows

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
            height: "calc(100vh - 350px + var(--header-offset, 0px))",
          }}
        >
          <DndContext
            collisionDetection={closestCenter}
            id="payment-receipts-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <PaymentReceiptsTableHeader
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
                        isSelected={rowSelection[row.id] ?? false}
                        key={row.id}
                        nonClickableColumns={NON_CLICKABLE_COLUMNS}
                        onCellClick={openReceipt}
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

      <AnimatePresence>
        {selectedRows.length ? (
          <BottomBar
            selectedCount={selectedRows.length}
            onDeselect={() => table.toggleAllRowsSelected(false)}
          >
            <Button
              onClick={() => table.toggleAllRowsSelected(false)}
              size="sm"
              variant="outline"
            >
              Clear selection
            </Button>
          </BottomBar>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
