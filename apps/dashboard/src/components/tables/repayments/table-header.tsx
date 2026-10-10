"use client"

import { TableHead, TableHeader, TableRow } from "@halaalvest/ui/components/table"
import { flexRender, type Table } from "@tanstack/react-table"
import { ResizeHandle } from "@/components/tables/resize-handle"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { STICKY_COLUMNS } from "@/utils/table-configs"
import type { TableId } from "@/utils/table-settings"

export function RepaymentsTableHeader<TData>({
  table,
  tableId,
}: {
  table: Table<TData>
  tableId: "repaymentHistory" | "repaymentSchedule"
}) {
  const { getStickyClassName, getStickyStyle } = useStickyColumns({
    stickyColumns: STICKY_COLUMNS[tableId as TableId],
    table,
  })

  return (
    <TableHeader className="sticky top-0 z-20 block w-full border-0 bg-background">
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow
          className="flex h-11 min-w-full items-center border-b border-border hover:bg-transparent"
          key={headerGroup.id}
        >
          {headerGroup.headers.map((header) => (
            <TableHead
              className={getStickyClassName(
                header.column.id,
                "relative flex h-full items-center bg-background px-4 text-xs text-muted-foreground"
              )}
              key={header.id}
              style={{ width: header.getSize(), ...getStickyStyle(header.column.id) }}
            >
              {header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.header,
                  header.getContext()
                )}
              <ResizeHandle header={header} />
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  )
}
