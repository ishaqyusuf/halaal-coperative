"use client"

import { Skeleton } from "@halaalvest/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@halaalvest/ui/components/table"
import { cn } from "@halaalvest/ui/lib/utils"
import type {
  ColumnDef,
  ColumnSizingState,
  VisibilityState,
} from "@tanstack/react-table"
import { useMemo } from "react"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { SkeletonCell } from "./skeleton-cell"
import { getColumnId, getHeaderLabel, type TableColumnMeta } from "./types"

interface TableSkeletonProps<TData> {
  columns: ColumnDef<TData>[]
  rowCount?: number
  columnVisibility?: VisibilityState
  columnSizing?: ColumnSizingState
  columnOrder?: string[]
  stickyColumnIds?: string[]
  actionsColumnId?: string
  isEmpty?: boolean
  className?: string
}

export function TableSkeleton<TData>({
  columns,
  rowCount = 40,
  columnVisibility = {},
  columnSizing = {},
  columnOrder = [],
  stickyColumnIds = [],
  actionsColumnId = "actions",
  isEmpty = false,
  className,
}: TableSkeletonProps<TData>) {
  const rows = useMemo(
    () => [...Array(rowCount)].map((_, i) => ({ id: i.toString() })),
    [rowCount]
  )

  const orderedColumns = useMemo(() => {
    if (columnOrder.length > 0) {
      const ordered = columnOrder
        .map((id) => columns.find((c) => getColumnId(c) === id))
        .filter(Boolean) as typeof columns

      const orderedIds = new Set(columnOrder)
      const remaining = columns.filter((c) => !orderedIds.has(getColumnId(c)))

      return [...ordered, ...remaining]
    }

    return columns
  }, [columns, columnOrder])

  const visibleColumns = useMemo(() => {
    return orderedColumns.filter((col) => {
      const id = getColumnId(col)
      if (id === "select" || id === actionsColumnId) return true
      return columnVisibility[id] !== false
    })
  }, [orderedColumns, columnVisibility, actionsColumnId])

  const { getStickyStyle, getStickyClassName } = useStickyColumns({
    columnVisibility,
    loading: true,
  })

  const isSticky = (columnId: string) => stickyColumnIds.includes(columnId)

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "overflow-auto overscroll-x-none scrollbar-hide",
          !isEmpty && "md:border-l md:border-r md:border-b md:border-border"
        )}
      >
        <Table
          className={cn(isEmpty && "pointer-events-none opacity-20 blur-[7px]")}
        >
          <TableHeader className="sticky top-0 z-20 block border-0 bg-background">
            <TableRow className="flex h-[45px] items-center !border-b-0 hover:bg-transparent">
              {visibleColumns.map((col) => {
                const columnId = getColumnId(col)
                const meta = col.meta as TableColumnMeta | undefined
                const sticky = isSticky(columnId)
                const isActions = columnId === actionsColumnId
                const isStatus = columnId === "status"

                const width = columnSizing[columnId] ?? col.size ?? 150
                const minWidth = sticky ? width : (col.minSize ?? width)
                const maxWidth = sticky ? width : (col.maxSize ?? width)

                const stickyClass = getStickyClassName(
                  columnId,
                  "group/header relative h-full px-4 border-t border-border flex items-center"
                )
                const headerClassName = isActions
                  ? "group/header relative h-full px-4 border-t border-border flex items-center justify-center md:sticky md:right-0 bg-background z-10"
                  : sticky
                    ? `${stickyClass} bg-background z-10`
                    : stickyClass

                return (
                  <TableHead
                    key={columnId}
                    className={headerClassName}
                    style={{
                      width,
                      minWidth,
                      maxWidth,
                      ...getStickyStyle(columnId),
                      ...(!isActions &&
                        !isStatus && {
                          borderRight: "1px solid hsl(var(--border))",
                        }),
                      ...(isActions && {
                        borderLeft: "1px solid hsl(var(--border))",
                        borderTop: "1px solid hsl(var(--border))",
                      }),
                    }}
                  >
                    {columnId === "select" ? (
                      <Skeleton className="h-4 w-4" />
                    ) : meta?.skeleton?.type === "text" &&
                      columnId === "description" ? (
                      <div className="flex w-full items-center justify-between overflow-hidden">
                        <div className="min-w-0 overflow-hidden">
                          <span className="text-muted-foreground">
                            {getHeaderLabel(col)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {getHeaderLabel(col)}
                      </span>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>

          <TableBody className="border-l-0 border-r-0">
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="group flex h-[45px] items-center border-b border-border"
              >
                {visibleColumns.map((col) => {
                  const columnId = getColumnId(col)
                  const meta = col.meta as TableColumnMeta | undefined
                  const sticky = isSticky(columnId)
                  const isActions = columnId === actionsColumnId

                  const width = columnSizing[columnId] ?? col.size ?? 150
                  const minWidth = sticky ? width : (col.minSize ?? width)
                  const maxWidth = sticky ? width : (col.maxSize ?? width)

                  const cellClassName = cn(
                    "h-full flex items-center",
                    getStickyClassName(columnId, meta?.className),
                    isActions &&
                      "md:sticky md:right-0 bg-background z-10 justify-center"
                  )

                  return (
                    <TableCell
                      key={columnId}
                      className={cellClassName}
                      style={{
                        width,
                        minWidth,
                        maxWidth,
                        ...getStickyStyle(columnId),
                        ...(isActions && {
                          borderLeft: "1px solid hsl(var(--border))",
                          borderBottom: "1px solid hsl(var(--border))",
                        }),
                      }}
                    >
                      {meta?.skeleton ? (
                        <SkeletonCell
                          type={meta.skeleton.type}
                          width={meta.skeleton.width}
                        />
                      ) : (
                        <Skeleton className="h-3.5 w-24" />
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
