import {
  DashboardDataTable,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
} from "./data-table"
import { SkeletonCell } from "./skeleton-cell"
import type { TableColumn } from "./types"

export function TableSkeleton<TItem>({
  columns,
  rowCount = 8,
}: {
  columns: Array<TableColumn<TItem>>
  rowCount?: number
}) {
  return (
    <DashboardDataTable>
      <DashboardTable>
        <DashboardTableHead>
          {columns.map((column) => (
            <DashboardTableHeaderCell key={column.key} align={column.align}>
              {column.label}
            </DashboardTableHeaderCell>
          ))}
        </DashboardTableHead>
        <DashboardTableBody>
          {Array.from({ length: rowCount }).map((_, index) => (
            <DashboardTableRow key={index}>
              {columns.map((column) => (
                <DashboardTableCell key={column.key} align={column.align}>
                  <SkeletonCell type={column.align === "right" ? "badge" : "text"} />
                </DashboardTableCell>
              ))}
            </DashboardTableRow>
          ))}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardDataTable>
  )
}
