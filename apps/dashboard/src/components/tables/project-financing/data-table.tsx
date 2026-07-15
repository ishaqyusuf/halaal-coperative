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
import { useProjectFinancingFilterParams } from "@/hooks/use-project-financing-filter-params"
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useProjectFinancingStore } from "@/store/project-financing"
import { useTRPC } from "@/trpc/client"
import {
  ROW_HEIGHTS,
  STICKY_COLUMNS,
  SUMMARY_GRID_HEIGHTS,
} from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns, type ProjectFinancingRequest } from "./columns"
import { ProjectFinancingEmptyState } from "./empty-states"
import { ProjectFinancingSkeleton } from "./skeleton"
import { ProjectFinancingTableHeader } from "./table-header"

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"])
const COLUMN_IDS = getColumnIds(columns)

type ProjectFinancingSortField =
  | "approvedAmount"
  | "businessName"
  | "disbursedAt"
  | "estimatedMonthlyPayback"
  | "memberName"
  | "requestedAmount"
  | "requestedAt"
  | "status"

type ProjectFinancingStatus =
  | "active"
  | "approved"
  | "cancelled"
  | "completed"
  | "rejected"
  | "submitted"
  | "under_review"

function getSort(
  sort?: string[] | null
): [ProjectFinancingSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, ProjectFinancingSortField> = {
    approved: "approvedAmount",
    approvedAmount: "approvedAmount",
    businessName: "businessName",
    disbursed: "disbursedAt",
    disbursedAt: "disbursedAt",
    estimatedMonthlyPayback: "estimatedMonthlyPayback",
    monthly: "estimatedMonthlyPayback",
    requested: "requestedAmount",
    requestedAmount: "requestedAmount",
    requestedAt: "requestedAt",
    request: "businessName",
    status: "status",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

function getStatus(value: string | null): ProjectFinancingStatus | undefined {
  const validStatuses = new Set<ProjectFinancingStatus>([
    "active",
    "approved",
    "cancelled",
    "completed",
    "rejected",
    "submitted",
    "under_review",
  ])

  return validStatuses.has(value as ProjectFinancingStatus)
    ? (value as ProjectFinancingStatus)
    : undefined
}

type Props = {
  canReview: boolean
  initialSettings?: Partial<TableSettings>
  requests: ProjectFinancingRequest[]
}

export function ProjectFinancingDataTable({
  canReview,
  initialSettings,
  requests,
}: Props) {
  const trpc = useTRPC()
  const parentRef = useRef<HTMLDivElement>(null)
  const { filter } = useProjectFinancingFilterParams()
  const { params } = useSortParams()
  const { setParams } = useProjectFinancingParams()
  const { rowSelection, setColumns, setRowSelection } =
    useProjectFinancingStore()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () => ({
      q: deferredSearch || undefined,
      sort: getSort(params.sort),
      status: getStatus(filter.status),
    }),
    [deferredSearch, filter.status, params.sort]
  )
  const infiniteQueryOptions = trpc.projectFinancing.list.infiniteQueryOptions(
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
    () => data?.pages.flatMap((page) => page.data) ?? requests,
    [data, requests]
  )

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

  const tableMeta = useMemo(
    () => ({
      canReview,
    }),
    [canReview]
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
    stickyColumns: STICKY_COLUMNS.projectFinancing,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 2,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.projectFinancing
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  })

  const openRequest = useCallback(
    (id?: string) => {
      if (!id || !canReview) {
        return
      }

      const request = tableData.find((candidate) => candidate.id === id)

      if (!request) {
        return
      }

      if (["submitted", "under_review"].includes(request.status)) {
        setParams({
          projectFinancingRequestId: id,
          projectFinancingSheetType: "review",
        })
        return
      }

      if (request.status === "approved") {
        setParams({
          projectFinancingRequestId: id,
          projectFinancingSheetType: "disbursement",
        })
      }
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

  if (isPending && !requests.length) {
    return <ProjectFinancingSkeleton />
  }

  if (isError && !requests.length) {
    return (
      <EmptyState
        description="Reload the page or adjust the project financing list before trying again."
        title="Project financing requests could not load."
      />
    )
  }

  if (!tableData.length) {
    return <ProjectFinancingEmptyState />
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
                        onCellClick={openRequest}
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
