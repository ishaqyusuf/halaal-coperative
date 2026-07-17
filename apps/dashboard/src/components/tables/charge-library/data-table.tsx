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
import { EmptyState, VirtualRow } from "@/components/tables/core"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useChargeLibraryTableStore } from "@/store/charge-library"
import { useTRPC } from "@/trpc/client"
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import { ChargeLibrarySkeleton } from "./skeleton"
import { ChargeLibraryTableHeader } from "./table-header"

export type ChargeLibraryRow = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  currentEffectiveFrom: string | null
  id: string
  isActive: boolean
  isMonthlyLevy: boolean
  kind: string
  name: string
  versions: Array<{
    amount: number
    effectiveFrom: string
    id: string
    notes: string | null
    status: "current" | "historical" | "scheduled"
  }>
}

type ChargeLibrarySortField =
  | "amount"
  | "currentEffectiveFrom"
  | "isActive"
  | "kind"
  | "name"

const COLUMN_IDS = getColumnIds(columns)

function getSort(
  sort?: string[] | null
): [ChargeLibrarySortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "amount",
    "currentEffectiveFrom",
    "isActive",
    "kind",
    "name",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as ChargeLibrarySortField, direction]
}

export function ChargeLibraryDataTable({
  canManageCharges,
  initialSettings,
}: {
  canManageCharges: boolean
  initialSettings?: Partial<TableSettings>
}) {
  const trpc = useTRPC()
  const { params } = useSortParams()
  const parentRef = useRef<HTMLDivElement>(null)
  const { setColumns } = useChargeLibraryTableStore()
  const queryInput = useMemo(
    () => ({
      sort: getSort(params.sort),
    }),
    [params.sort]
  )
  const infiniteQueryOptions = trpc.charges.chargeLibrary.infiniteQueryOptions(
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
    tableId: "chargeLibrary",
  })

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: tableData,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: {
      canManageCharges,
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
    setColumns(table.getAllLeafColumns())
  }, [columnVisibility, setColumns, table])

  const { getStickyClassName, getStickyStyle } = useStickyColumns({
    columnVisibility,
    stickyColumns: STICKY_COLUMNS.chargeLibrary,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.chargeLibrary
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

  if (isPending) {
    return <ChargeLibrarySkeleton />
  }

  if (isError) {
    return (
      <EmptyState
        description="Reload the page before trying to review charge definitions again."
        title="Charge definitions could not load."
      />
    )
  }

  if (!tableData.length) {
    return (
      <EmptyState
        description="Create reusable charges before posting member charges."
        title="No charge definitions yet."
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
            maxHeight: 420,
            minHeight: Math.min(360, tableData.length * rowHeight + 45),
          }}
        >
          <DndContext
            collisionDetection={closestCenter}
            id="charge-library-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <ChargeLibraryTableHeader
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
        </div>
      </div>
    </div>
  )
}
