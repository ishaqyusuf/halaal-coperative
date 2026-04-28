import {
  DashboardTableHead,
  DashboardTableHeaderCell,
} from "@/components/tables/core"
import { contributionColumns } from "./columns"

export function ContributionsTableHeader() {
  return (
    <DashboardTableHead>
      {contributionColumns.map((column) => (
        <DashboardTableHeaderCell key={column.key} align={column.align}>
          {column.label}
        </DashboardTableHeaderCell>
      ))}
    </DashboardTableHead>
  )
}
