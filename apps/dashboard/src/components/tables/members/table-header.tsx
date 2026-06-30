import {
  DashboardTableHead,
  DashboardTableHeaderCell,
} from "@/components/dashboard/static-table"
import { memberColumns } from "./columns"

export function MembersTableHeader() {
  return (
    <DashboardTableHead>
      {memberColumns.map((column) => (
        <DashboardTableHeaderCell key={column.key} align={column.align}>
          {column.label}
        </DashboardTableHeaderCell>
      ))}
    </DashboardTableHead>
  )
}
