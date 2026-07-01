"use client"

import { closestCenter, DndContext } from "@dnd-kit/core"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@halaalvest/ui/components/table"
import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { useRouter } from "next/navigation"
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { VirtualRow } from "@/components/tables/core"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useMembersFilterParams } from "@/hooks/use-members-filter-params"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useSortParams } from "@/hooks/use-sort-params"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useMembersStore } from "@/store/members"
import { useTRPC } from "@/trpc/client"
import { ROW_HEIGHTS, STICKY_COLUMNS, SUMMARY_GRID_HEIGHTS } from "@/utils/table-configs"
import { getColumnIds, type TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import { MembersEmptyState, MembersNoResults } from "./empty-states"
import { MembersTableHeader } from "./table-header"

const NON_CLICKABLE_COLUMNS = new Set(["actions"])
const COLUMN_IDS = getColumnIds(columns)

type MembersSortField =
  | "fullName"
  | "memberNumber"
  | "memberType"
  | "status"
  | "kycStatus"
  | "joinedAt"

type Props = {
  canManageMembers: boolean
  initialSettings?: Partial<TableSettings>
}

function getSort(sort?: string[] | null): [MembersSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "fullName",
    "memberNumber",
    "memberType",
    "status",
    "kycStatus",
    "joinedAt",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as MembersSortField, direction]
}

function getEnumValue<TValue extends string>(
  value: string | null,
  validValues: readonly TValue[]
) {
  return validValues.includes(value as TValue) ? (value as TValue) : undefined
}

export function MembersDataTable({
  canManageMembers,
  initialSettings,
}: Props) {
  const trpc = useTRPC()
  const router = useRouter()
  const { filters } = useMembersFilterParams()
  const { params } = useSortParams()
  const parentRef = useRef<HTMLDivElement>(null)
  const { setColumns } = useMembersStore()
  const deferredSearch = useDeferredValue(filters.q)

  useScrollHeader(parentRef, { extraOffset: SUMMARY_GRID_HEIGHTS.members })

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
    tableId: "members",
  })

  const queryInput = useMemo(
    () => ({
      joinedFrom: filters.joinedFrom ?? undefined,
      joinedTo: filters.joinedTo ?? undefined,
      kycStatus: getEnumValue(filters.kycStatus, [
        "not_started",
        "pending",
        "verified",
        "rejected",
      ] as const),
      memberType: getEnumValue(filters.memberType, [
        "civil_servant",
        "individual",
        "business",
      ] as const),
      q: deferredSearch,
      sort: getSort(params.sort),
      status: getEnumValue(filters.status, [
        "pending",
        "active",
        "inactive",
        "suspended",
        "exited",
      ] as const),
    }),
    [deferredSearch, filters, params.sort]
  )

  const infiniteQueryOptions = trpc.members.list.infiniteQueryOptions(
    queryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions)

  const tableData = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  )

  const tableMeta = useMemo(
    () => ({
      canManageMembers,
    }),
    [canManageMembers]
  )

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: tableData,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: tableMeta,
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
    stickyColumns: STICKY_COLUMNS.members,
    table,
  })

  const tableScroll = useTableScroll({
    startFromColumn: 1,
    useColumnWidths: true,
  })

  const rows = table.getRowModel().rows
  const rowHeight = ROW_HEIGHTS.members

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

  const setOpen = useCallback(
    (id?: string) => {
      if (id) {
        router.push(`/members/${id}`)
      }
    },
    [router]
  )

  const hasTableFilters = Object.values(filters).some(
    (value) => value !== null && value !== ""
  )

  if (!tableData.length && hasTableFilters) {
    return <MembersNoResults />
  }

  if (!tableData.length) {
    return <MembersEmptyState />
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
            height: "calc(100vh - 350px + var(--header-offset, 0px))",
          }}
        >
          <DndContext
            collisionDetection={closestCenter}
            id="members-table-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table className="w-full min-w-full">
              <MembersTableHeader table={table} tableScroll={tableScroll} />

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
                        onCellClick={setOpen}
                        row={row}
                        rowHeight={rowHeight}
                        virtualStart={virtualRow.start}
                      />
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={columns.length}>
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
