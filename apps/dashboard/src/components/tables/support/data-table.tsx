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
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useSortParams } from "@/hooks/use-sort-params"
import { useSupportFilterParams } from "@/hooks/use-support-filter-params"
import { useSupportCaseParams } from "@/hooks/use-support-case-params"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useSupportStore } from "@/store/support"
import { useTRPC } from "@/trpc/client"
import {
  ROW_HEIGHTS,
  STICKY_COLUMNS,
  SUMMARY_GRID_HEIGHTS,
} from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns, type SupportCase } from "./columns"
import { SupportEmptyState } from "./empty-states"
import { SupportSkeleton } from "./skeleton"
import { SupportTableHeader } from "./table-header"

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"])
const COLUMN_IDS = getColumnIds(columns)

type SupportSortField =
  | "assignedToUser"
  | "category"
  | "createdAt"
  | "latestReply"
  | "linkedRecord"
  | "priority"
  | "status"
  | "subject"
  | "updatedAt"

type SupportStatus =
  | "closed"
  | "in_progress"
  | "open"
  | "resolved"
  | "waiting_on_member"

type SupportPriority = "high" | "low" | "normal" | "urgent"

function getSort(
  sort?: string[] | null
): [SupportSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, SupportSortField> = {
    assignedToUser: "assignedToUser",
    assignee: "assignedToUser",
    case: "subject",
    category: "category",
    createdAt: "createdAt",
    latestReply: "latestReply",
    linkedRecord: "linkedRecord",
    priority: "priority",
    status: "status",
    subject: "subject",
    updatedAt: "updatedAt",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

function getStatus(value: string | null): SupportStatus | undefined {
  const validStatuses = new Set<SupportStatus>([
    "closed",
    "in_progress",
    "open",
    "resolved",
    "waiting_on_member",
  ])

  return validStatuses.has(value as SupportStatus)
    ? (value as SupportStatus)
    : undefined
}

function getPriority(value: string | null): SupportPriority | undefined {
  const validPriorities = new Set<SupportPriority>([
    "high",
    "low",
    "normal",
    "urgent",
  ])

  return validPriorities.has(value as SupportPriority)
    ? (value as SupportPriority)
    : undefined
}

type Props = {
  canReviewFinancialAdjustments: boolean
  cases: SupportCase[]
  initialSettings?: Partial<TableSettings>
  mode?: "member" | "staff"
}

export function SupportDataTable({
  canReviewFinancialAdjustments,
  cases,
  initialSettings,
  mode = "staff",
}: Props) {
  const trpc = useTRPC()
  const parentRef = useRef<HTMLDivElement>(null)
  const { filter } = useSupportFilterParams()
  const { params } = useSortParams()
  const { setParams } = useSupportCaseParams()
  const { rowSelection, setColumns, setRowSelection } = useSupportStore()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () => ({
      priority: getPriority(filter.priority),
      q: deferredSearch || undefined,
      sort: getSort(params.sort),
      status: getStatus(filter.status),
    }),
    [deferredSearch, filter.priority, filter.status, params.sort]
  )
  const infiniteQueryOptions = trpc.support.list.infiniteQueryOptions(
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
    () => data?.pages.flatMap((page) => page.data) ?? cases,
    [data, cases]
  )

  useScrollHeader(parentRef, { extraOffset: SUMMARY_GRID_HEIGHTS.support })

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
    tableId: "support",
  })

  const tableMeta = useMemo(
    () => ({
      canReviewFinancialAdjustments,
      mode,
    }),
    [canReviewFinancialAdjustments, mode]
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
    stickyColumns: STICKY_COLUMNS.support,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 2,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.support
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  })

  const openCase = useCallback(
    (id?: string) => {
      if (!id) {
        return
      }

      const supportCase = tableData.find((candidate) => candidate.id === id)
      if (mode === "member") {
        if (supportCase?.status !== "closed") {
          setParams({
            supportCaseId: id,
            supportCaseSheetType: "member-reply",
          })
        }
        return
      }

      setParams({ supportCaseId: id, supportCaseSheetType: "update" })
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

  if (isPending && !cases.length) {
    return <SupportSkeleton />
  }

  if (isError && !cases.length) {
    return (
      <EmptyState
        description="Reload the page or adjust the support list before trying again."
        title="Support cases could not load."
      />
    )
  }

  if (!tableData.length) {
    return <SupportEmptyState />
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
            id="support-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <SupportTableHeader table={table} tableScroll={tableScroll} />

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
                        onCellClick={openCase}
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
