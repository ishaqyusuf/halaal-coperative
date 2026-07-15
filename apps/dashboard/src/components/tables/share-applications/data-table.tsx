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
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { BottomBar, EmptyState, VirtualRow } from "@/components/tables/core"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useShareApplicationFilterParams } from "@/hooks/use-share-application-filter-params"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useShareApplicationsStore } from "@/store/share-applications"
import { useTRPC } from "@/trpc/client"
import {
  ROW_HEIGHTS,
  STICKY_COLUMNS,
  SUMMARY_GRID_HEIGHTS,
} from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns, type ShareApplication } from "./columns"
import { ShareApplicationsEmptyState } from "./empty-states"
import { ShareApplicationsSkeleton } from "./skeleton"
import { ShareApplicationsTableHeader } from "./table-header"

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"])

type ShareApplicationSortField =
  | "createdAt"
  | "memberName"
  | "requestedUnits"
  | "reviewedAt"
  | "shareValueSnapshot"
  | "status"

type ShareApplicationStatus =
  | "approved"
  | "cancelled"
  | "pending"
  | "rejected"

function getSort(
  sort?: string[] | null
): [ShareApplicationSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, ShareApplicationSortField> = {
    application: "memberName",
    createdAt: "createdAt",
    memberName: "memberName",
    requestedAt: "createdAt",
    requestedUnits: "requestedUnits",
    reviewedAt: "reviewedAt",
    shareValueSnapshot: "shareValueSnapshot",
    status: "status",
    units: "requestedUnits",
    value: "shareValueSnapshot",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

function getStatus(value: string | null): ShareApplicationStatus | undefined {
  const validStatuses = new Set<ShareApplicationStatus>([
    "approved",
    "cancelled",
    "pending",
    "rejected",
  ])

  return validStatuses.has(value as ShareApplicationStatus)
    ? (value as ShareApplicationStatus)
    : undefined
}

function getSortValue(row: ShareApplication, field: ShareApplicationSortField) {
  if (field === "memberName") return row.memberName

  return row[field] ?? ""
}

function sortRows(
  rows: ShareApplication[],
  sort?: [ShareApplicationSortField, "asc" | "desc"] | null
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
  rows: ShareApplication[],
  filter: ReturnType<typeof useShareApplicationFilterParams>["filter"]
) {
  const query = (filter.shareApplicationQ ?? "").toLowerCase()
  const status = getStatus(filter.shareApplicationStatus)

  return rows.filter((row) => {
    if (status && row.status !== status) {
      return false
    }

    if (!query) return true

    const searchable = [
      row.memberName,
      row.memberNumber,
      row.memberEmail ?? "",
      row.notes ?? "",
      row.reviewNotes ?? "",
      row.status,
    ]
      .join(" ")
      .toLowerCase()

    return searchable.includes(query)
  })
}

type Props = {
  applications: ShareApplication[]
  canReview?: boolean
  initialSettings?: Partial<TableSettings>
  remoteRows?: boolean
}

export function ShareApplicationsDataTable({
  applications,
  canReview = false,
  initialSettings,
  remoteRows = true,
}: Props) {
  const trpc = useTRPC()
  const parentRef = useRef<HTMLDivElement>(null)
  const { filter } = useShareApplicationFilterParams()
  const { params } = useSortParams()
  const { setParams } = useShareApplicationParams()
  const { rowSelection, setColumns, setRowSelection } =
    useShareApplicationsStore()
  const deferredSearch = useDeferredValue(filter.shareApplicationQ)
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
  const queryInput = useMemo(
    () => ({
      q: deferredSearch || undefined,
      sort: getSort(params.sort),
      status: getStatus(filter.shareApplicationStatus),
    }),
    [deferredSearch, filter.shareApplicationStatus, params.sort]
  )
  const infiniteQueryOptions = trpc.shareApplications.list.infiniteQueryOptions(
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
        ? (data?.pages.flatMap((page) => page.data) ?? applications)
        : sortRows(
            filterRows(applications, filter),
            getSort(params.sort)
          ),
    [applications, data, filter, params.sort, remoteRows]
  )

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
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
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
    stickyColumns: STICKY_COLUMNS.shareApplications,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 2,
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
      if (!canReview || !id) {
        return
      }

      const application = tableData.find((candidate) => candidate.id === id)
      if (application?.status !== "pending") {
        return
      }

      setParams({
        shareApplicationId: id,
        shareApplicationSheetType: "review",
      })
    },
    [canReview, tableData, setParams]
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

  if (remoteRows && isPending && !applications.length) {
    return <ShareApplicationsSkeleton />
  }

  if (remoteRows && isError && !applications.length) {
    return (
      <EmptyState
        description="Reload the page or adjust the share application list before trying again."
        title="Share applications could not load."
      />
    )
  }

  if (!tableData.length) {
    return <ShareApplicationsEmptyState />
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
            id="share-applications-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
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
                        isSelected={rowSelection[row.id] ?? false}
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
