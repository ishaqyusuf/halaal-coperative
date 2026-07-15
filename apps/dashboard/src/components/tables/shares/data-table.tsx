"use client"

import { closestCenter, DndContext } from "@dnd-kit/core"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@halaalvest/ui/components/table"
import type { TenantSharePolicySettings } from "@halaalvest/db"
import { useInfiniteQuery } from "@tanstack/react-query"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from "react"
import { ShareSheet } from "@/components/sheets/share-sheet"
import { VirtualRow } from "@/components/tables/core"
import { useShareFilterParams } from "@/hooks/use-share-filter-params"
import { useShareParams } from "@/hooks/use-share-params"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useShareTableStore } from "@/store/shares"
import { useTRPC } from "@/trpc/client"
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns, type Share } from "./columns"
import { EmptyState, NoResults } from "./empty-states"
import { ShareSkeleton } from "./skeleton"
import { SharesTableHeader } from "./table-header"

const COLUMN_IDS = getColumnIds(columns)
const NON_CLICKABLE_COLUMNS = new Set(["actions"])

type ShareSortField =
  | "amount"
  | "effectiveFrom"
  | "isCurrent"
  | "notes"
  | "valueType"

type Props = {
  financeStartDate?: string | null
  hasSourceRows?: boolean
  initialSettings?: Partial<TableSettings>
  isLocked: boolean
  renderSheet?: boolean
  remoteRows?: boolean
  sheetRows: Share[]
  sharePolicy: TenantSharePolicySettings
}

function getSort(
  sort?: string[] | null
): [ShareSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "amount",
    "effectiveFrom",
    "isCurrent",
    "notes",
    "valueType",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as ShareSortField, direction]
}

function getSortValue(row: Share, field: ShareSortField) {
  if (field === "isCurrent") return row.isCurrent ? 1 : 0

  return row[field] ?? ""
}

function sortRows(
  rows: Share[],
  sort?: [ShareSortField, "asc" | "desc"] | null
) {
  if (!sort) return rows

  const [field, direction] = sort
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = getSortValue(left, field)
    const rightValue = getSortValue(right, field)

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor
    }

    return String(leftValue).localeCompare(String(rightValue)) * factor
  })
}

function filterRows(
  rows: Share[],
  filter: ReturnType<typeof useShareFilterParams>["filter"]
) {
  const query = (filter.q ?? "").toLowerCase()

  return rows.filter((row) => {
    const matchesStatus =
      !filter.status ||
      (filter.status === "current" ? row.isCurrent : !row.isCurrent)
    const matchesValueType =
      !filter.valueType || row.valueType === filter.valueType
    const matchesEffectiveFrom =
      !filter.effectiveFrom || row.effectiveFrom >= filter.effectiveFrom
    const matchesEffectiveTo =
      !filter.effectiveTo || row.effectiveFrom <= filter.effectiveTo

    if (
      !matchesStatus ||
      !matchesValueType ||
      !matchesEffectiveFrom ||
      !matchesEffectiveTo
    ) {
      return false
    }

    if (!query) return true

    const searchable = [
      row.effectiveFrom,
      row.valueType === "percentage"
        ? "percentage after charges"
        : "fixed amount",
      row.amount.toString(),
      row.notes ?? "",
      row.isCurrent ? "current" : "historical",
    ]
      .join(" ")
      .toLowerCase()

    return searchable.includes(query)
  })
}

export function DataTable({
  financeStartDate,
  hasSourceRows,
  initialSettings,
  isLocked,
  renderSheet = true,
  remoteRows = true,
  sheetRows,
  sharePolicy,
}: Props) {
  const trpc = useTRPC()
  const { filter } = useShareFilterParams()
  const { setParams } = useShareParams()
  const { params } = useSortParams()
  const parentRef = useRef<HTMLDivElement>(null)
  const { setColumns } = useShareTableStore()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () => ({
      effectiveFrom: filter.effectiveFrom ?? undefined,
      effectiveTo: filter.effectiveTo ?? undefined,
      q: deferredSearch || undefined,
      sort: getSort(params.sort),
      status: filter.status ?? undefined,
      valueType: filter.valueType ?? undefined,
    }),
    [deferredSearch, filter, params.sort]
  )
  const infiniteQueryOptions = trpc.charges.financeShares.infiniteQueryOptions(
    queryInput,
    {
      enabled: remoteRows,
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
    () =>
      remoteRows
        ? (data?.pages.flatMap((page) => page.data) ?? [])
        : sortRows(filterRows(sheetRows, filter), getSort(params.sort)),
    [data, filter, params.sort, remoteRows, sheetRows]
  )
  const hasRows = hasSourceRows ?? tableData.length > 0

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
    tableId: "shares",
  })

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: tableData,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: {
      isLocked,
      onEdit: (id: string) => {
        setParams({ shareId: id, shareType: "edit" })
      },
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
    stickyColumns: STICKY_COLUMNS.shares,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })

  const rowHeight = ROW_HEIGHTS.shares
  const tableRows = table.getRowModel().rows
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  })

  useInfiniteScroll<HTMLDivElement>({
    fetchNextPage,
    hasNextPage: remoteRows ? hasNextPage : false,
    isFetchingNextPage,
    rowCount: tableRows.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 50,
  })

  const openShare = useCallback(
    (id?: string) => {
      if (isLocked || !id) {
        return
      }

      setParams({ shareId: id, shareType: "edit" })
    },
    [isLocked, setParams]
  )

  if (remoteRows && isPending) {
    return <ShareSkeleton />
  }

  if (remoteRows && isError) {
    return (
      <div className="w-full">
        <NoResults />
        {renderSheet ? (
          <ShareSheet
            financeStartDate={financeStartDate}
            isLocked={isLocked}
            rows={sheetRows}
            sharePolicy={sharePolicy}
          />
        ) : null}
      </div>
    )
  }

  if (!hasRows) {
    return (
      <div className="w-full">
        <EmptyState />
        {renderSheet ? (
          <ShareSheet
            financeStartDate={financeStartDate}
            isLocked={isLocked}
            rows={sheetRows}
            sharePolicy={sharePolicy}
          />
        ) : null}
      </div>
    )
  }

  if (!tableData.length) {
    return (
      <div className="w-full">
        <NoResults />
        {renderSheet ? (
          <ShareSheet
            financeStartDate={financeStartDate}
            isLocked={isLocked}
            rows={sheetRows}
            sharePolicy={sharePolicy}
          />
        ) : null}
      </div>
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
            minHeight: Math.min(360, tableRows.length * rowHeight + 45),
          }}
        >
          <DndContext
            collisionDetection={closestCenter}
            id="shares-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <SharesTableHeader table={table} tableScroll={tableScroll} />

              <TableBody
                className="block border-x-0"
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                }}
              >
                {virtualItems.length > 0 ? (
                  virtualItems.map((virtualRow: VirtualItem) => {
                    const row = tableRows[virtualRow.index]
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
                        onCellClick={openShare}
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

      {renderSheet ? (
        <ShareSheet
          financeStartDate={financeStartDate}
          isLocked={isLocked}
          rows={sheetRows}
          sharePolicy={sharePolicy}
        />
      ) : null}
    </div>
  )
}
