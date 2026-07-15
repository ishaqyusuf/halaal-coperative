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
import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from "react"
import { ChargeSheet } from "@/components/sheets/charge-sheet"
import { VirtualRow } from "@/components/tables/core"
import { useChargeFilterParams } from "@/hooks/use-charge-filter-params"
import { useChargeParams } from "@/hooks/use-charge-params"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useChargeTableStore } from "@/store/charges"
import { useTRPC } from "@/trpc/client"
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns, type Charge } from "./columns"
import { EmptyState, NoResults } from "./empty-states"
import { Loading } from "./skeleton"
import { ChargesTableHeader } from "./table-header"

const COLUMN_IDS = getColumnIds(columns)
const NON_CLICKABLE_COLUMNS = new Set(["actions"])

type ChargeSortField =
  | "chargeFrequency"
  | "chargeValueType"
  | "currentAmount"
  | "isActive"
  | "name"
  | "versionCount"

type Props = {
  financeStartDate?: string | null
  hasSourceRows?: boolean
  initialSettings?: Partial<TableSettings>
  isLocked: boolean
  quickFillEnabled?: boolean
  remoteRows?: boolean
  sheetRows: Charge[]
}

function getSort(
  sort?: string[] | null
): [ChargeSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "chargeFrequency",
    "chargeValueType",
    "currentAmount",
    "isActive",
    "name",
    "versionCount",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as ChargeSortField, direction]
}

function getSortValue(row: Charge, field: ChargeSortField) {
  if (field === "currentAmount") return row.currentVersion?.amount ?? 0
  if (field === "isActive") return row.isActive ? 1 : 0
  if (field === "versionCount") return row.versions.length

  return row[field] ?? ""
}

function sortRows(
  rows: Charge[],
  sort?: [ChargeSortField, "asc" | "desc"] | null
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
  rows: Charge[],
  filter: ReturnType<typeof useChargeFilterParams>["filter"]
) {
  const query = (filter.q ?? "").toLowerCase()

  return rows.filter((row) => {
    const matchesStatus =
      !filter.status ||
      (filter.status === "active" ? row.isActive : !row.isActive)
    const matchesFrequency =
      !filter.frequency || row.chargeFrequency === filter.frequency
    const matchesValueType =
      !filter.valueType || row.chargeValueType === filter.valueType

    if (!matchesStatus || !matchesFrequency || !matchesValueType) {
      return false
    }

    if (!query) return true

    const searchable = [
      row.name,
      row.code,
      row.kind,
      row.chargeFrequency,
      row.chargeValueType,
      row.isActive ? "active" : "inactive",
      row.currentVersion?.amount.toString() ?? "",
      row.currentVersion?.notes ?? "",
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
  quickFillEnabled = false,
  remoteRows = true,
  sheetRows,
}: Props) {
  const trpc = useTRPC()
  const { filter } = useChargeFilterParams()
  const { setParams } = useChargeParams()
  const { params } = useSortParams()
  const parentRef = useRef<HTMLDivElement>(null)
  const { setColumns } = useChargeTableStore()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () => ({
      frequency: filter.frequency ?? undefined,
      q: deferredSearch || undefined,
      sort: getSort(params.sort),
      status: filter.status ?? undefined,
      valueType: filter.valueType ?? undefined,
    }),
    [deferredSearch, filter, params.sort]
  )
  const infiniteQueryOptions = trpc.charges.financeCharges.infiniteQueryOptions(
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
    tableId: "charges",
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
      onAddUpdate: (id: string) => {
        setParams({ chargeId: id, chargeType: "update" })
      },
      onEditVersion: (chargeId: string, versionId: string) => {
        setParams({ chargeId, chargeType: "edit", chargeVersionId: versionId })
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
    stickyColumns: STICKY_COLUMNS.charges,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })

  const rowHeight = ROW_HEIGHTS.charges
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

  const openCharge = useCallback(
    (id?: string) => {
      if (isLocked || !id) {
        return
      }

      setParams({ chargeId: id, chargeType: "update" })
    },
    [isLocked, setParams]
  )

  if (remoteRows && isPending) {
    return <Loading />
  }

  if (remoteRows && isError) {
    return (
      <div className="w-full">
        <NoResults />
        <ChargeSheet
          financeStartDate={financeStartDate}
          isLocked={isLocked}
          quickFillEnabled={quickFillEnabled}
          rows={sheetRows}
        />
      </div>
    )
  }

  if (!hasRows) {
    return (
      <div className="w-full">
        <EmptyState />
        <ChargeSheet
          financeStartDate={financeStartDate}
          isLocked={isLocked}
          quickFillEnabled={quickFillEnabled}
          rows={sheetRows}
        />
      </div>
    )
  }

  if (!tableData.length) {
    return (
      <div className="w-full">
        <NoResults />
        <ChargeSheet
          financeStartDate={financeStartDate}
          isLocked={isLocked}
          quickFillEnabled={quickFillEnabled}
          rows={sheetRows}
        />
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
            id="charges-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <ChargesTableHeader table={table} tableScroll={tableScroll} />

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
                        onCellClick={openCharge}
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

      <ChargeSheet
        financeStartDate={financeStartDate}
        isLocked={isLocked}
        quickFillEnabled={quickFillEnabled}
        rows={sheetRows}
      />
    </div>
  )
}
