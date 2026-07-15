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

export function NotificationsTableHeader<TData>({
  loading,
  table,
  tableScroll,
}: Props<TData>) {
  const { sortColumn, sortValue, createSortQuery } = useSortQuery()
  const { getStickyClassName, getStickyStyle, isVisible } = useStickyColumns({
    loading,
    stickyColumns: STICKY_COLUMNS.notifications,
    table,
  })

  const sortableColumnIds = useMemo(() => {
    if (!table) return []

    return table
      .getAllLeafColumns()
      .filter((column) => !NON_REORDERABLE_COLUMNS.notifications.has(column.id))
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
            {headerGroup.headers.map((header) => {
              const columnId = header.column.id
              const canReorder =
                !NON_REORDERABLE_COLUMNS.notifications.has(columnId)

              if (!isVisible(columnId)) return null

              const headerStyle = {
                width: header.getSize(),
                minWidth: header.column.columnDef.minSize,
                ...getStickyStyle(columnId),
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
  const sortField = SORT_FIELD_MAPS.notifications[columnId]

  if (columnId === "subject") {
    return (
      <div className="flex w-full items-center justify-between overflow-hidden">
        <div className="min-w-0 overflow-hidden">
          <SortButton
            currentSortColumn={sortColumn}
            currentSortValue={sortValue}
            label="Subject"
            onSort={createSortQuery}
            sortField="subject"
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
          label={getHeaderLabel(columnId)}
          onSort={createSortQuery}
          sortField={sortField}
        />
      </div>
    )
  }

  return (
    <span className="truncate">{header.column.columnDef.header as string}</span>
  )
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
  onSort: (field: string) => void
  sortField: string
}) {
  return (
    <Button
      className="min-w-0 max-w-full space-x-2 p-0 hover:bg-transparent"
      onClick={(event) => {
        event.stopPropagation()
        onSort(sortField)
      }}
      variant="ghost"
    >
      <span className="truncate">{label}</span>
      {sortField === currentSortColumn && currentSortValue === "asc" ? (
        <ArrowDown size={16} />
      ) : null}
      {sortField === currentSortColumn && currentSortValue === "desc" ? (
        <ArrowUp size={16} />
      ) : null}
    </Button>
  )
}

function getHeaderLabel(columnId: string): string {
  const labels: Record<string, string> = {
    createdAt: "Created",
    recipient: "Recipient",
    status: "Status",
    subject: "Subject",
    type: "Type",
  }

  return labels[columnId] || columnId
}
