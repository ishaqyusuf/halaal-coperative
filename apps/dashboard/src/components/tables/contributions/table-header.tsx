"use client"

import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable"
import { Button } from "@halaalvest/ui/components/button"
import {
  TableHead,
  TableHeader,
  TableRow,
} from "@halaalvest/ui/components/table"
import type { Header, Table } from "@tanstack/react-table"
import { ArrowDown, ArrowUp } from "lucide-react"
import { useMemo } from "react"
import { HorizontalPagination } from "@/components/horizontal-pagination"
import { type TableScrollState } from "@/components/tables/core"
import { DraggableHeader } from "@/components/tables/draggable-header"
import { ResizeHandle } from "@/components/tables/resize-handle"
import { useSortQuery } from "@/hooks/use-sort-query"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import {
  NON_REORDERABLE_COLUMNS,
  SORT_FIELD_MAPS,
  STICKY_COLUMNS,
} from "@/utils/table-configs"

interface Props<TData> {
  loading?: boolean
  table?: Table<TData>
  tableScroll?: TableScrollState
}

export function ContributionsTableHeader<TData>({
  loading,
  table,
  tableScroll,
}: Props<TData>) {
  const { sortColumn, sortValue, createSortQuery } = useSortQuery()
  const { getStickyClassName, getStickyStyle, isVisible } = useStickyColumns({
    loading,
    stickyColumns: STICKY_COLUMNS.contributions,
    table,
  })

  const sortableColumnIds = useMemo(() => {
    if (!table) return []

    return table
      .getAllLeafColumns()
      .filter(
        (column) => !NON_REORDERABLE_COLUMNS.contributions.has(column.id)
      )
      .map((column) => column.id)
  }, [table])

  if (!table) return null

  return (
    <TableHeader className="sticky top-0 z-20 block w-full border-0 bg-background">
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow
          className="flex h-[45px] min-w-full items-center !border-b-0 hover:bg-transparent"
          key={headerGroup.id}
        >
          <SortableContext
            items={sortableColumnIds}
            strategy={horizontalListSortingStrategy}
          >
            {headerGroup.headers.map((header, headerIndex, headers) => {
              const columnId = header.column.id
              const meta = header.column.columnDef.meta as
                | { sticky?: boolean }
                | undefined
              const isSticky = meta?.sticky
              const canReorder =
                !NON_REORDERABLE_COLUMNS.contributions.has(columnId)

              if (!isVisible(columnId)) return null

              const isLastVisible =
                headerIndex === headers.length - 1 ||
                !headers.slice(headerIndex + 1).some((item) =>
                  isVisible(item.column.id)
                )
              const shouldFlex = isLastVisible && !isSticky
              const headerStyle = {
                width: header.getSize(),
                minWidth: isSticky
                  ? header.getSize()
                  : header.column.columnDef.minSize,
                maxWidth: isSticky ? header.getSize() : undefined,
                ...getStickyStyle(columnId),
                ...(shouldFlex && { flex: 1 }),
              }

              if (!canReorder) {
                const stickyClass = getStickyClassName(
                  columnId,
                  "group/header relative flex h-full items-center border-t border-border px-4"
                )

                return (
                  <TableHead
                    className={`${stickyClass} z-10 bg-background`}
                    key={header.id}
                    style={headerStyle}
                  >
                    {renderHeaderContent(
                      header,
                      columnId,
                      sortColumn,
                      sortValue,
                      createSortQuery,
                      tableScroll
                    )}
                    <ResizeHandle header={header} />
                  </TableHead>
                )
              }

              return (
                <DraggableHeader
                  id={columnId}
                  key={header.id}
                  style={headerStyle}
                >
                  <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                    {renderHeaderContent(
                      header,
                      columnId,
                      sortColumn,
                      sortValue,
                      createSortQuery,
                      tableScroll
                    )}
                  </div>
                  <ResizeHandle header={header} />
                </DraggableHeader>
              )
            })}
          </SortableContext>
        </TableRow>
      ))}
    </TableHeader>
  )
}

function renderHeaderContent<TData>(
  header: Header<TData, unknown>,
  columnId: string,
  sortColumn: string | undefined,
  sortValue: string | undefined,
  createSortQuery: (name: string) => void,
  tableScroll?: TableScrollState
) {
  const sortField = SORT_FIELD_MAPS.contributions[columnId]

  if (columnId === "member") {
    return (
      <div className="flex w-full items-center justify-between overflow-hidden">
        <div className="min-w-0 overflow-hidden">
          <SortButton
            currentSortColumn={sortColumn}
            currentSortValue={sortValue}
            label="Member"
            onSort={createSortQuery}
            sortField="memberName"
          />
        </div>
        {tableScroll?.isScrollable ? (
          <HorizontalPagination
            canScrollLeft={tableScroll.canScrollLeft}
            canScrollRight={tableScroll.canScrollRight}
            className="hidden flex-shrink-0 md:flex"
            onScrollLeft={tableScroll.scrollLeft}
            onScrollRight={tableScroll.scrollRight}
          />
        ) : null}
      </div>
    )
  }

  if (sortField) {
    return (
      <div className="w-full overflow-hidden">
        <SortButton
          currentSortColumn={sortColumn}
          currentSortValue={sortValue}
          label={getHeaderLabel(columnId, header)}
          onSort={createSortQuery}
          sortField={sortField}
        />
      </div>
    )
  }

  return (
    <span className="truncate text-sm font-medium text-muted-foreground">
      {getHeaderLabel(columnId, header)}
    </span>
  )
}

function getHeaderLabel<TData>(
  columnId: string,
  header?: Header<TData, unknown>
) {
  const meta = header?.column.columnDef.meta as
    | { headerLabel?: string }
    | undefined

  return meta?.headerLabel ?? columnId
}

function SortButton({
  currentSortColumn,
  currentSortValue,
  label,
  onSort,
  sortField,
}: {
  currentSortColumn?: string
  currentSortValue?: string
  label: string
  onSort: (name: string) => void
  sortField: string
}) {
  const isActive = currentSortColumn === sortField
  const Icon = currentSortValue === "asc" ? ArrowUp : ArrowDown

  return (
    <Button
      className="h-8 min-w-0 justify-start gap-1 px-0 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
      onClick={() => onSort(sortField)}
      size="sm"
      type="button"
      variant="ghost"
    >
      <span className="truncate">{label}</span>
      {isActive ? <Icon className="size-3.5 shrink-0" /> : null}
    </Button>
  )
}
