"use client"

import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  TableHead,
  TableHeader,
  TableRow,
} from "@halaalvest/ui/components/table"
import type { Header, Table } from "@tanstack/react-table"
import { useMemo } from "react"
import { HorizontalPagination } from "@/components/horizontal-pagination"
import {
  ACTIONS_FULL_WIDTH_HEADER_CLASS,
  ACTIONS_STICKY_HEADER_CLASS,
  type TableScrollState,
} from "@/components/tables/core"
import { DraggableHeader } from "@/components/tables/draggable-header"
import { ResizeHandle } from "@/components/tables/resize-handle"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import {
  NON_REORDERABLE_COLUMNS,
  STICKY_COLUMNS,
} from "@/utils/table-configs"

interface Props<TData> {
  loading?: boolean
  table?: Table<TData>
  tableScroll?: TableScrollState
}

export function ShareApplicationsTableHeader<TData>({
  loading,
  table,
  tableScroll,
}: Props<TData>) {
  const { getStickyClassName, getStickyStyle, isVisible } = useStickyColumns({
    loading,
    stickyColumns: STICKY_COLUMNS.shareApplications,
    table,
  })

  const sortableColumnIds = useMemo(() => {
    if (!table) return []

    return table
      .getAllLeafColumns()
      .filter(
        (column) => !NON_REORDERABLE_COLUMNS.shareApplications.has(column.id)
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
                !NON_REORDERABLE_COLUMNS.shareApplications.has(columnId)
              const isActions = columnId === "actions"

              if (!isVisible(columnId)) return null

              const hasNonStickyVisible = headers.some((item) => {
                if (item.column.id === "actions") return false
                if (!isVisible(item.column.id)) return false
                const itemMeta = item.column.columnDef.meta as
                  | { sticky?: boolean }
                  | undefined
                return !itemMeta?.sticky
              })
              const actionsFullWidth = isActions && !hasNonStickyVisible
              const isLastBeforeActions =
                headerIndex === headers.length - 2 &&
                headers[headers.length - 1]?.column.id === "actions"
              const shouldFlex =
                (isLastBeforeActions && !isSticky) || actionsFullWidth

              const headerStyle = {
                width: actionsFullWidth ? undefined : header.getSize(),
                minWidth: actionsFullWidth
                  ? undefined
                  : isSticky
                    ? header.getSize()
                    : header.column.columnDef.minSize,
                maxWidth: actionsFullWidth
                  ? undefined
                  : isSticky
                    ? header.getSize()
                    : undefined,
                ...(!actionsFullWidth && getStickyStyle(columnId)),
                ...(shouldFlex && { flex: 1 }),
              }

              if (!canReorder) {
                const stickyClass = getStickyClassName(
                  columnId,
                  columnId === "select"
                    ? "group/header relative flex h-full items-center justify-center border-t border-border px-0"
                    : "group/header relative flex h-full items-center border-t border-border px-4"
                )
                const finalClassName = isActions
                  ? actionsFullWidth
                    ? ACTIONS_FULL_WIDTH_HEADER_CLASS
                    : ACTIONS_STICKY_HEADER_CLASS
                  : `${stickyClass} z-10 bg-background`

                return (
                  <TableHead
                    className={finalClassName}
                    key={header.id}
                    style={headerStyle}
                  >
                    {renderHeaderContent(header, columnId, table, tableScroll)}
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
                    {renderHeaderContent(header, columnId, table, tableScroll)}
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
  table: Table<TData>,
  tableScroll?: TableScrollState
) {
  if (columnId === "select") {
    const allPageRowsSelected = table.getIsAllPageRowsSelected()
    const somePageRowsSelected = table.getIsSomePageRowsSelected()

    return (
      <Checkbox
        aria-label="Select all visible share applications"
        aria-checked={
          allPageRowsSelected
            ? true
            : somePageRowsSelected
              ? "mixed"
              : false
        }
        checked={allPageRowsSelected}
        data-indeterminate={
          !allPageRowsSelected && somePageRowsSelected ? "" : undefined
        }
        onCheckedChange={(checked) => {
          table.toggleAllPageRowsSelected(checked === true)
        }}
      />
    )
  }

  if (columnId === "actions") {
    return (
      <span className="w-full text-center text-muted-foreground">Actions</span>
    )
  }

  if (columnId === "application") {
    return (
      <div className="flex w-full items-center justify-between overflow-hidden">
        <span className="truncate">Application</span>
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

  return (
    <span className="truncate">{header.column.columnDef.header as string}</span>
  )
}
