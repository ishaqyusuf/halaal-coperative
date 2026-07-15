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
import { AnimatePresence } from "framer-motion"
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { VirtualRow } from "@/components/tables/core"
import { useBusinessFilterParams } from "@/hooks/use-business-filter-params"
import { useBusinessParams } from "@/hooks/use-business-params"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useBusinessStore } from "@/store/business"
import { useTRPC } from "@/trpc/client"
import {
  ROW_HEIGHTS,
  STICKY_COLUMNS,
  SUMMARY_GRID_HEIGHTS,
} from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { BusinessBottomBar } from "./bottom-bar"
import { columns } from "./columns"
import { BusinessEmptyState, BusinessNoResults } from "./empty-states"
import { BusinessSkeleton } from "./skeleton"
import { BusinessTableHeader } from "./table-header"

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"])
const COLUMN_IDS = getColumnIds(columns)

type BusinessSortField =
  | "name"
  | "startDate"
  | "capitalAmount"
  | "profitAmount"
  | "status"

type Props = {
  initialSettings?: Partial<TableSettings>
  isLocked: boolean
}

function getSort(
  sort?: string[] | null
): [BusinessSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "name",
    "startDate",
    "capitalAmount",
    "profitAmount",
    "status",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as BusinessSortField, direction]
}

function getEnumValue<TValue extends string>(
  value: string | null,
  validValues: readonly TValue[]
) {
  return validValues.includes(value as TValue) ? (value as TValue) : undefined
}

export function DataTable({ initialSettings, isLocked }: Props) {
  const trpc = useTRPC()
  const { filter } = useBusinessFilterParams()
  const { params } = useSortParams()
  const { setParams } = useBusinessParams()
  const parentRef = useRef<HTMLDivElement>(null)
  const { rowSelection, setColumns, setRowSelection } = useBusinessStore()
  const deferredSearch = useDeferredValue(filter.q)

  useScrollHeader(parentRef, { extraOffset: SUMMARY_GRID_HEIGHTS.business })

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
    tableId: "business",
  })

  const queryInput = useMemo(
    () => ({
      dividendPeriodId: filter.dividendPeriodId ?? undefined,
      hasProfitEntries: filter.hasProfitEntries ?? undefined,
      profitStatus: getEnumValue(filter.profitStatus, [
        "draft",
        "pending",
        "reviewed",
        "completed",
        "approved",
        "archived",
      ] as const),
      q: deferredSearch,
      sort: getSort(params.sort),
      sourceType: getEnumValue(filter.sourceType, [
        "manual",
        "backfill",
        "import",
      ] as const),
      startFrom: filter.startFrom ?? undefined,
      startTo: filter.startTo ?? undefined,
      status: getEnumValue(filter.status, [
        "planned",
        "active",
        "completed",
        "archived",
      ] as const),
    }),
    [deferredSearch, filter, params.sort]
  )

  const infiniteQueryOptions = trpc.business.list.infiniteQueryOptions(
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

  const tableMeta = useMemo(
    () => ({
      isLocked,
    }),
    [isLocked]
  )

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: tableData,
    enableColumnResizing: true,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: tableMeta,
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
    stickyColumns: STICKY_COLUMNS.business,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 2,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.business
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

  const openBusiness = useCallback(
    (id?: string) => {
      if (!id) {
        return
      }

      setParams({
        businessId: id,
        businessType: "details",
        profitEntryId: null,
      })
    },
    [setParams]
  )

  const hasTableFilters = Object.values(filter).some(
    (value) => value !== null && value !== ""
  )

  if (isPending) {
    return <BusinessSkeleton />
  }

  if (isError) {
    return <BusinessNoResults />
  }

  if (!tableData.length && hasTableFilters) {
    return <BusinessNoResults />
  }

  if (!tableData.length) {
    return <BusinessEmptyState />
  }

  const virtualItems = rowVirtualizer.getVirtualItems()
  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)

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
            id="business-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <BusinessTableHeader table={table} tableScroll={tableScroll} />

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
                        onCellClick={openBusiness}
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
          <BusinessBottomBar
            businesses={selectedRows}
            onDeselect={() => table.toggleAllRowsSelected(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
