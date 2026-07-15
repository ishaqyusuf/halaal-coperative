import { TableSkeleton } from "@/components/tables/core"
import { columns } from "./columns"
import type { MonthlyRecordMemberTableRow } from "./data-table"

export function MonthlyRecordsSkeleton() {
  return (
    <TableSkeleton<MonthlyRecordMemberTableRow>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["member", "actions"]}
    />
  )
}
